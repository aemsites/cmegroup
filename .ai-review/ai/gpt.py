import os
# from openai import OpenAI
from openai import AzureOpenAI
from ai.ai_bot import AiBot

class GPT(AiBot):

    def __init__(self, api_key, model, endpoint, api_version):
        self.__chat_gpt_model = model
        # self.__client = OpenAI(api_key = token)
        self.__client = AzureOpenAI(
            api_key=api_key,
            api_version=api_version,
            azure_endpoint=endpoint
        )


    def ai_request_diffs(self, code, diffs):
        stream = self.__client.chat.completions.create(
            messages=[
                {
                    "role": "user",
                    "content": AiBot.build_ask_text(code=code, diffs=diffs),
                }
            ],
            model = self.__chat_gpt_model,
            stream = True,
        )
        content = []
        for chunk in stream:
            if chunk.choices[0].delta.content:
                content.append(chunk.choices[0].delta.content)
        return " ".join(content)
    