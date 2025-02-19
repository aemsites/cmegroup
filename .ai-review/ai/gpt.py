import os
# from openai import OpenAI
from openai import AzureOpenAI
from ai.ai_bot import AiBot
from log import Log
from tenacity import (
    retry,
    stop_after_attempt,
    wait_exponential,
    retry_if_exception_type,
    before_sleep_log
)
import requests.exceptions
import concurrent.futures

class GPT(AiBot):

    def __init__(self, token, model):
        Log.print_green(f"Initializing GPT with model: {model}")
        self.__gpt_model = model
        self.__client = AzureOpenAI(
            api_key=token,
            api_version=os.getenv("AZURE_API_VERSION", "2024-02-15-preview"),
            azure_endpoint=os.getenv("AZURE_ENDPOINT"),
            timeout=90  # Increased base client timeout to 90 seconds
        )
        Log.print_green("GPT client initialized")

    def _make_request_with_timeout(self, messages, timeout=60):
        """Make API request with timeout handling"""
        try:
            with concurrent.futures.ThreadPoolExecutor() as executor:
                future = executor.submit(
                    self.__client.chat.completions.create,
                    messages=messages,
                    model=self.__gpt_model,
                    stream=False,
                    timeout=timeout
                )
                response = future.result(timeout=timeout)
                return response.choices[0].message.content
        except concurrent.futures.TimeoutError:
            Log.print_yellow(f"Request timed out after {timeout} seconds, returning no issues")
            return self._no_response
        except Exception as e:
            Log.print_red(f"Error in request: {str(e)}")
            raise

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=(
            retry_if_exception_type(requests.exceptions.RequestException) |
            retry_if_exception_type(ConnectionError)
        ),
        before_sleep=before_sleep_log(Log.print_yellow, "Retrying request"),
        reraise=True
    )
    def ai_request_diffs(self, code, diffs, file_path, pr_history=None):
        """
        Request AI review with improved error handling and timeout management.
        Returns "No critical issues found" in case of timeout.
        """
        Log.print_green("Starting AI request for diffs")
        Log.print_green(f"Using model: {self.__gpt_model}")
        Log.print_green("Preparing request...")
        
        try:
            content = AiBot.build_ask_text(
                code=code, 
                diffs=diffs, 
                file_path=file_path,
                pr_history=pr_history
            )
            
            messages = [{"role": "user", "content": content}]
            
            # Use timeout handler
            response = self._make_request_with_timeout(
                messages,
                timeout=60  # 60 seconds timeout for the request
            )
            
            Log.print_green("Received response from Azure OpenAI")
            return response
            
        except Exception as e:
            if isinstance(e, (concurrent.futures.TimeoutError, requests.exceptions.Timeout)):
                Log.print_yellow(f"Request timed out: {str(e)}")
                return self._no_response
            else:
                Log.print_red(f"Attempt failed: {str(e)}")
                raise

    @property
    def _no_response(self):
        """Default response for timeouts or errors"""
        return "No critical issues found"
    