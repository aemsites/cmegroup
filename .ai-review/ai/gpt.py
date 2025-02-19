import os
# from openai import OpenAI
from openai import AzureOpenAI
from ai.ai_bot import AiBot
from log import Log
from tenacity import retry, stop_after_attempt, wait_exponential

class GPT(AiBot):

    def __init__(self, token, model):
        Log.print_green(f"Initializing ChatGPT with model: {model}")
        self.__chat_gpt_model = model
        self.__client = AzureOpenAI(
            api_key=token,
            api_version=os.getenv("AZURE_API_VERSION", "2024-02-15-preview"),
            azure_endpoint=os.getenv("AZURE_ENDPOINT")
        )
        Log.print_green("ChatGPT client initialized")

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=4, max=10))
    def ai_request_diffs(self, code, diffs):
        Log.print_green("Starting AI request for diffs")
        Log.print_green(f"Using model: {self.__chat_gpt_model}")
        Log.print_green("Preparing request...")
        
        try:
            Log.print_green("Sending request to Azure OpenAI...")
            response = self.__client.chat.completions.create(
                messages=[
                    {
                        "role": "user",
                        "content": AiBot.build_ask_text(code=code, diffs=diffs),
                    }
                ],
                model=self.__chat_gpt_model,
                stream=False,
            )
            Log.print_green("Received response from Azure OpenAI")
            return response.choices[0].message.content
            
        except Exception as e:
            Log.print_red(f"Error in AI request: {str(e)}")
            raise
    