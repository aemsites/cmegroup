import os
# from openai import OpenAI
from openai import AzureOpenAI
from ai.ai_bot import AiBot
from log import Log
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

class GPT(AiBot):

    def __init__(self, token, model):
        Log.print_green(f"Initializing ChatGPT with model: {model}")
        self.__gpt_model = model
        self.__client = AzureOpenAI(
            api_key=token,
            api_version=os.getenv("AZURE_API_VERSION", "2024-02-15-preview"),
            azure_endpoint=os.getenv("AZURE_ENDPOINT")
        )
        Log.print_green("GPT client initialized")

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type((TimeoutError, ConnectionError)),
        reraise=True
    )
    def ai_request_diffs(self, code, diffs, file_path, pr_history=None):
        Log.print_green("Starting AI request for diffs")
        Log.print_green(f"Using model: {self.__gpt_model}")
        Log.print_green("Preparing request...")
        
        try:
            Log.print_green("Sending request to Azure OpenAI...")
            response = self.__client.chat.completions.create(
                messages=[
                    {
                        "role": "user",
                        "content": AiBot.build_ask_text(
                            code=code, 
                            diffs=diffs, 
                            file_path=file_path,
                            pr_history=pr_history
                        ),
                    }
                ],
                model=self.__gpt_model,
                stream=False,
                timeout=30,
            )
            Log.print_green("Received response from Azure OpenAI")
            return response.choices[0].message.content
            
        except Exception as e:
            Log.print_red(f"Attempt failed: {str(e)}")
            raise
    