import re
from typing import Any

import torch

from agent.src.system_prompt import HYDE_SYSTEM_PROMPT, SYSTEM_PROMPT
from agent.src.tool_use.tool_handler import execute_tool, parse_tool_call
from agent.src.tool_use.tools import TOOL_SCHEMAS

_ANSWER_PATTERN = re.compile(r"<answer>\s*(.*?)\s*</answer>", re.DOTALL)


def parse_final_answer(text: str) -> str | None:
    match = _ANSWER_PATTERN.search(text)
    if not match:
        return None
    return match.group(1).strip()


def format_tool_result(tool_result: str) -> str:
    return f"<tool_result>\n{tool_result}\n</tool_result>"


def _contains_tool_call_tags(text: str) -> bool:
    return "<tool_call>" in text and "</tool_call>" in text


class ReActAgent:
    def __init__(self, model, tokenizer):
        self.model = model
        self.tokenizer = tokenizer

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
            tools=TOOL_SCHEMAS,
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

        return self.tokenizer.decode(
            output_ids[0][input_len:], skip_special_tokens=True
        )

    def _generate_hypothetical_document(
        self,
        user_query: str,
        *,
        max_new_tokens: int = 192,
        do_sample: bool = True,
        temperature: float = 0.3,
    ) -> str:
        device = next(self.model.parameters()).device

        hyde_history = [
            {"role": "system", "content": HYDE_SYSTEM_PROMPT},
            {"role": "user", "content": user_query},
        ]

        input_text = self.tokenizer.apply_chat_template(
            hyde_history,
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

        return self.tokenizer.decode(
            output_ids[0][input_len:], skip_special_tokens=True
        )

    def run(
        self,
        user_query,
        max_steps=5,
        max_new_tokens=1024,
        *,
        do_sample=True,
        temperature=0.3,
        context: list[dict] = None,
    ):
        """
        Ejecuta el bucle ReAct para resolver la query.
        """
        history = [
            {"role": "system", "content": SYSTEM_PROMPT},
            *(context or []),
            {"role": "user", "content": user_query},
        ]

        trace = history[1:]  # Para guardar los pasos dados y mostrarlos en la API
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
            history.append({"role": "assistant", "content": generated_text})

            # ======= Check for answer tags first
            final_answer = parse_final_answer(generated_text)
            if final_answer is not None:
                return {"response": final_answer, "trace": trace}

            # ======= Check for tool call in the generated text
            parsed = parse_tool_call(generated_text)
            if parsed is not None:
                # Execute the tool and record in trace
                tool_name, tool_args = parsed

                if tool_name == "rag_retrieve_context":
                    # For RAG retrieval, we first generate a hypothetical document to use as context
                    user_query_for_hyde = tool_args.get("query", "")
                    hyde_doc = self._generate_hypothetical_document(
                        user_query_for_hyde,
                        max_new_tokens=192,
                        do_sample=True,
                        temperature=0.3,
                    )
                    tool_args["query"] = user_query_for_hyde + "\n\n" + hyde_doc

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
                history.append({"role": "tool", "content": tool_result_tagged})

        return {
            "response": f"{generated_text}\n\n(Reached max steps without finding a final answer.)",
            "trace": trace,
        }
