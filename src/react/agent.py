import torch

from src.system_prompt import SYSTEM_PROMPT
from src.tool_use.tools import TOOL_SCHEMAS
from src.tool_use.tool_handler import execute_tool, parse_tool_call


class ReActAgent:
    def __init__(self, model, tokenizer):
        self.model = model
        self.tokenizer = tokenizer
        self.tools_prompt = TOOL_SCHEMAS
        self.system_prompt = SYSTEM_PROMPT

    def run(self, user_query, max_steps=5, max_new_tokens=1024):
        """
        Ejecuta el bucle ReAct para resolver la query.
        """
        history = [
            {"role": "system", "content": self.system_prompt},
            {"role": "user", "content": user_query},
        ]

        trace = []  # Para guardar los pasos dados y mostrarlos en la API
        device = next(self.model.parameters()).device

        step = 0
        while step < max_steps:
            input_text = self.tokenizer.apply_chat_template(
                history,
                tools=TOOL_SCHEMAS,
                add_generation_prompt=True,
                tokenize=False,
            )

            inputs = self.tokenizer(input_text, return_tensors="pt")
            inputs = {k: v.to(device) for k, v in inputs.items()}
            input_len = inputs["input_ids"].shape[-1]

            with torch.no_grad():
                output_ids = self.model.generate(
                    **inputs,
                    max_new_tokens=max_new_tokens,
                    do_sample=True,
                    temperature=0.3,
                    pad_token_id=self.tokenizer.eos_token_id,
                )

            generated_text = self.tokenizer.decode(
            output_ids[0][input_len:], skip_special_tokens=True)
            trace.append({"role": "assistant", "content": generated_text})

            # Check for tool call in the generated text
            parsed = parse_tool_call(generated_text)
            if parsed is None:
                # No tool call — this is the final answer
                return {"response": generated_text, "trace": trace}

            # Execute the tool and record in trace
            tool_name, tool_args = parsed
            tool_result = execute_tool(tool_name, tool_args)
            trace.append(
                {
                    "role": "tool",
                    "tool_name": tool_name,
                    "tool_args": tool_args,
                    "content": tool_result,
                }
            )

            # Append to conversation history for next generation turn
            history.append({"role": "assistant", "content": generated_text})
            history.append({"role": "tool", "content": tool_result})

        return {"response": generated_text, "trace": trace}
