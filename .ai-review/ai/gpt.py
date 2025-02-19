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
from log_manager import LogManager

class GPT(AiBot):

    def __init__(self, token, model):
        Log.print_green(f"Initializing GPT with model: {model}")
        self.__gpt_model = model
        self.__client = AzureOpenAI(
            api_key=token,
            api_version=os.getenv("AZURE_API_VERSION", "2024-02-15-preview"),
            azure_endpoint=os.getenv("AZURE_ENDPOINT"),
            timeout=600  # Increased to 10 minutes
        )
        Log.print_green("GPT client initialized")

    def _count_tokens(self, text: str) -> int:
        """Count the number of tokens in a text string"""
        return len(self.__encoding.encode(text))

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(
            multiplier=20,    
            min=20,          
            max=240
        ),
        retry=(
            retry_if_exception_type(requests.exceptions.RequestException) |
            retry_if_exception_type(ConnectionError) |
            retry_if_exception_type(concurrent.futures.TimeoutError)
        ),
        before_sleep=before_sleep_log(Log.print_yellow, "Retrying request after wait period"),
        reraise=True
    )
    def _make_request_with_timeout(self, messages, timeout=600):  # Increased to 10 minutes
        """Make API request with timeout handling"""
        try:
            # Add system message to define AI's role
            system_message = {
                "role": "system",
                "content": """You are an expert code reviewer with deep knowledge of software development best practices. 
                Your task is to review code changes and provide specific, actionable feedback.
                
                For each issue you find:
                1. Identify the line number
                2. Explain the issue clearly
                3. Suggest a specific fix
                4. Format your response as: "line_number : explanation and suggested fix"
                
                Focus on:
                - Code quality and best practices
                - Potential bugs and edge cases
                - Performance implications
                - Security concerns
                - Maintainability
                
                If you find no issues, respond with exactly: "No critical issues found"
                """
            }
            
            all_messages = [system_message] + messages
            request_content = messages[0]['content']
            
            # Log the request
            Log.print_green(f"Making API request with {timeout}s timeout")
            Log.print_green(f"Request size: {len(request_content)} characters")
            LogManager.write_log(f"\n\n=== REQUEST ===\n{request_content}\n")
            
            with concurrent.futures.ThreadPoolExecutor() as executor:
                future = executor.submit(
                    self.__client.chat.completions.create,
                    messages=all_messages,
                    model=self.__gpt_model,
                    stream=False,
                    timeout=timeout
                )
                response = future.result(timeout=timeout)
                
                response_text = response.choices[0].message.content
                
                # Log the response
                Log.print_green(f"Response size: {len(response_text)} characters")
                LogManager.write_log(f"\n=== RESPONSE ===\n{response_text}\n")
                
                return response_text
                
        except (concurrent.futures.TimeoutError, requests.exceptions.Timeout) as e:
            Log.print_yellow(f"Request timed out after {timeout} seconds, retrying...")
            raise  # Raise for retry
        except Exception as e:
            Log.print_red(f"Error in request: {str(e)}")
            raise

    def ai_request_diffs(self, code, diffs, file_path, pr_history=None):
        """Request AI review with improved error handling"""
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
            
            try:
                response = self._make_request_with_timeout(messages)
                Log.print_green("Received response from Azure OpenAI")
                return response
            except Exception as e:
                Log.print_red(f"All retries failed: {str(e)}")
                return self._no_response
                
        except Exception as e:
            Log.print_red(f"Error preparing request: {str(e)}")
            return self._no_response

    @property
    def _no_response(self):
        """Default response for timeouts or errors"""
        return "No critical issues found"
    