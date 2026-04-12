import torch
import json
from typing import Any

from src.system_prompt import SYSTEM_PROMPT
from src.tool_use.tools import TOOL_SCHEMAS
from src.tool_use.tool_handler import execute_tool, parse_tool_call


def format_tool_result(tool_result: str) -> str:
    return f"<tool_result>\n{tool_result}\n</tool_result>"


def _contains_tool_call_tags(text: str) -> bool:
    return "<tool_call>" in text and "</tool_call>" in text


class ReActAgent:
    def __init__(self, model, tokenizer, *, system_prompt: str = SYSTEM_PROMPT, tools_prompt=None):
        self.model = model
        self.tokenizer = tokenizer
        self.tools_prompt = tools_prompt if tools_prompt is not None else TOOL_SCHEMAS
        self.system_prompt = system_prompt

    def _generate_assistant(
        self,
        history: list[dict[str, str]],
        *,
        max_new_tokens: int,
        do_sample: bool,
        temperature: float,
    ) -> str:
        device = next(self.model.parameters()).device

        input_text = self.tokenizer.apply_chat_template(
            history,
            tools=self.tools_prompt,
            add_generation_prompt=True,
            tokenize=False,
        )

        inputs = self.tokenizer(input_text, return_tensors="pt")
        inputs = {k: v.to(device) for k, v in inputs.items()}
        input_len = inputs["input_ids"].shape[-1]

        generate_kwargs: dict[str, Any] = {
            "max_new_tokens": max_new_tokens,
            "do_sample": do_sample,
            "pad_token_id": self.tokenizer.eos_token_id,
        }
        if do_sample:
            generate_kwargs["temperature"] = temperature

        with torch.no_grad():
            output_ids = self.model.generate(**inputs, **generate_kwargs)

        return self.tokenizer.decode(output_ids[0][input_len:], skip_special_tokens=True)

    def run(
        self,
        user_query,
        max_steps=5,
        max_new_tokens=1024,
        *,
        do_sample=True,
        temperature=0.3,
    ):
        """
        Ejecuta el bucle ReAct para resolver la query.
        """
        history = [
            {"role": "system", "content": self.system_prompt},
            {"role": "user", "content": user_query},
        ]

        trace = []  # Para guardar los pasos dados y mostrarlos en la API
        generated_text = ""

        try:
            max_steps_int = int(max_steps)
        except (TypeError, ValueError):
            max_steps_int = 5
        max_steps_int = max(1, max_steps_int)

        for _ in range(max_steps_int):
            generated_text = self._generate_assistant(
                history,
                max_new_tokens=max_new_tokens,
                do_sample=do_sample,
                temperature=temperature,
            )
            trace.append({"role": "assistant", "content": generated_text})

            # Check for tool call in the generated text
            parsed = parse_tool_call(generated_text)
            if parsed is None:
                if _contains_tool_call_tags(generated_text):
                    parser_error_payload = {
                        "status": "error",
                        "tool_name": "tool_parser",
                        "message": (
                            "Malformed or unsupported <tool_call> payload. "
                            "Use valid JSON with a known tool name and object arguments."
                        ),
                    }
                    parser_error_tagged = format_tool_result(
                        json.dumps(parser_error_payload, ensure_ascii=False)
                    )

                    trace.append(
                        {
                            "role": "tool",
                            "tool_name": "tool_parser",
                            "tool_args": {},
                            "content": parser_error_tagged,
                        }
                    )
                    history.append({"role": "assistant", "content": generated_text})
                    history.append({"role": "tool", "content": parser_error_tagged})
                    continue

                # No tool call — this is the final answer
                return {"response": generated_text, "trace": trace}

            # Execute the tool and record in trace
            tool_name, tool_args = parsed
            tool_result = execute_tool(tool_name, tool_args)
            tool_result_tagged = format_tool_result(tool_result)
            trace.append(
                {
                    "role": "tool",
                    "tool_name": tool_name,
                    "tool_args": tool_args,
                    "content": tool_result_tagged,
                }
            )

            # Append to conversation history for next generation turn
            history.append({"role": "assistant", "content": generated_text})
            history.append({"role": "tool", "content": tool_result_tagged})

        return {"response": generated_text, "trace": trace}
