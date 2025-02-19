import os
from git import Git 
from pathlib import Path
from ai.gpt import GPT
from ai.ai_bot import AiBot
from log import Log
from env_vars import EnvVars
from repository.github import GitHub
from repository.repository import RepositoryError

separator = "\n\n----------------------------------------------------------------------\n\n"
log_file = open('output.txt', 'a')

def main():
    Log.print_green("Starting AI Review process...")
    
    Log.print_green("Checking environment variables...")
    vars = EnvVars()
    vars.check_vars()

    Log.print_green("Initializing AI client...")
    ai = GPT(vars.azure_openai_api_key, vars.gpt_model)
    
    Log.print_green("Initializing GitHub client...")
    github = GitHub(vars.token, vars.owner, vars.repo, vars.pull_number)

    Log.print_green("Getting Git remote name...")
    remote_name = Git.get_remote_name()
    Log.print_green("Remote is", remote_name)
    
    Log.print_green(f"Getting diff files between {vars.head_ref} and {vars.base_ref}...")
    changed_files = Git.get_diff_files(remote_name=remote_name, head_ref=vars.head_ref, base_ref=vars.base_ref)
    Log.print_green("Found changes in files:", changed_files)
    
    if len(changed_files) == 0: 
        Log.print_red("No changes between branches")
        return

    for file in changed_files:
        Log.print_green(f"Processing file: {file}")

        _, file_extension = os.path.splitext(file)
        file_extension = file_extension.lstrip('.')
        if file_extension not in vars.target_extensions:
            Log.print_yellow(f"Skipping unsupported extension {file_extension} in file {file}")
            continue

        try:
            Log.print_green(f"Reading file: {file}")
            with open(file, 'r') as file_opened:
                file_content = file_opened.read()
        except FileNotFoundError:
            Log.print_yellow(f"File was removed: {file}")
            continue

        if len(file_content) == 0: 
            Log.print_red(f"File is empty: {file}")
            continue

        Log.print_green(f"Getting diffs for file: {file}")
        file_diffs = Git.get_diff_in_file(remote_name=remote_name, head_ref=vars.head_ref, base_ref=vars.base_ref, file_path=file)
        if len(file_diffs) == 0: 
            Log.print_red("No diffs found in file")
            continue
        
        Log.print_green(f"Requesting AI review for {file}. Content Length: {len(file_content)}, Diff Length: {len(file_diffs)}")
        response = ai.ai_request_diffs(code=file_content, diffs=file_diffs)
        Log.print_green(f"Received AI response for {file}. Length: {len(response)}")

        log_file.write(f"{separator}{file_content}{separator}{file_diffs}{separator}{response}{separator}")
        log_file.flush()  # Ensure logs are written immediately

        if AiBot.is_no_issues_text(response):
            Log.print_green(f"No issues found in file: {file}")
        else:
            Log.print_green(f"Processing AI responses for {file}")
            responses = AiBot.split_ai_response(response)
            if len(responses) == 0:
                Log.print_red("No parsed responses from AI")
                continue

            for response_item in responses:
                if response_item.line:
                    Log.print_green(f"Posting line comment for {file} at line {response_item.line}")
                    result = post_line_comment(github=github, file=file, text=response_item.text, line=response_item.line)
                    if result:
                        Log.print_green("Line comment posted successfully")
                    else:
                        Log.print_yellow("Failed to post line comment, trying general comment")
                        result = post_general_comment(github=github, file=file, text=response_item.text)
                else:
                    Log.print_green(f"Posting general comment for {file}")
                    result = post_general_comment(github=github, file=file, text=response_item.text)
                
                if not result:
                    raise RepositoryError("Failed to post any comments")

    Log.print_green("AI Review process completed successfully")

def post_line_comment(github: GitHub, file: str, text:str, line: int):
    Log.print_green("Posting line", file, line, text)
    try:
        git_response = github.post_comment_to_line(
            text=text, 
            commit_id=Git.get_last_commit_sha(file=file), 
            file_path=file, 
            line=line,
        )
        Log.print_yellow("Posted", git_response)
        return True
    except RepositoryError as e:
        Log.print_red("Failed line comment", e)
        return False

def post_general_comment(github: GitHub, file: str, text:str) -> bool:
    Log.print_green("Posting general", file, text)
    try:
        message = f"{file}\n{text}"
        git_response = github.post_comment_general(message)
        Log.print_yellow("Posted general", git_response)
        return True
    except RepositoryError:
        Log.print_red("Failed general comment")
        return False

if __name__ == "__main__":
    main()

log_file.close()