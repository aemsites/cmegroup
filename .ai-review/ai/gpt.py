import os
# from openai import OpenAI
from openai import AzureOpenAI
from ai.ai_bot import AiBot

class GPT(AiBot):

    def __init__(self, api_key, model, endpoint, api_version):
        self.__gpt_model = model
        # self.__client = OpenAI(api_key = token)
        self.__client = AzureOpenAI(
            api_key=api_key,
            api_version=api_version,
            azure_endpoint=endpoint
        )


    def ai_request_diffs(self, code, diffs):
        response = self.__client.chat.completions.create(
            messages=[
                {
                    "role": "user",
                    "content": AiBot.build_ask_text(code=code, diffs=diffs),
                }
            ],
            model=self.__gpt_model,
            stream=False,
        )
        return response.choices[0].message.content
    