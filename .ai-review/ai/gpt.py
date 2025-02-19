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

    def before_sleep_callback(retry_state):
        """Custom function to run before each retry attempt."""
        attempt_num = retry_state.attempt_number
        # Logging the last exception (reason) is optional
        exception_str = str(retry_state.outcome.exception()) if retry_state.outcome else "Unknown error"
        Log.print_yellow(f"Retrying request after wait period - Attempt #{attempt_num}, Reason: {exception_str}")

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
        before_sleep=before_sleep_callback,
        reraise=True
    )
    def _make_request_with_timeout(self, messages, timeout=600):
        """Make API request with timeout handling"""
        try:
            system_instructions = """You are an expert code reviewer with deep knowledge 
of software development best practices. Your task is to review code changes and provide 
specific, actionable feedback.

For each issue you find:
1. Only comment on lines that have been changed or added in the diff
2. Identify the specific line number from the NEW file (after changes)
3. Determine the severity level:
   - CRITICAL: Bugs that will cause crashes, security vulnerabilities
   - HIGH: Major performance issues, significant code quality problems
   - MEDIUM: Best practices violations, maintainability issues
   - LOW: Minor improvements, suggestions
4. Format your response exactly as: "line_number [SEVERITY] : explanation and suggested fix"

Example responses:
42 [CRITICAL] : SQL injection vulnerability in user input
15 [HIGH] : O(n^2) performance in loop could cause slowdown
23 [MEDIUM] : Consider using async/await for better scalability

If you find no significant issues, respond with exactly: "No critical issues found"
"""

            if self.__gpt_model.lower() == "o1-mini":
                # Merge "system" instructions into the first user message
                if messages and messages[0]['role'] == 'user':
                    messages[0]['content'] = system_instructions + "\n\n" + messages[0]['content']
                all_messages = messages
            else:
                # Use a traditional system message
                system_message = {
                    "role": "system",
                    "content": system_instructions
                }
                all_messages = [system_message] + messages

            request_content = all_messages[0]['content']
            
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
            raise
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
    