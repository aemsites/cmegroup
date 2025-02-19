import os
from git import Git
from ai.gpt import GPT
from ai.ai_bot import AiBot
from log import Log
from env_vars import EnvVars
from repository.github import GitHub
from repository.repository import RepositoryError
from repository.pr_history import PRHistory
from dataclasses import dataclass
from typing import List, Optional
from log_manager import LogManager
import re
from ai.line_comment import Severity

@dataclass
class FileReviewData:
    file: str
    content: str
    diffs: str
    history: list
    responses: list
    success: bool = True
    error: Optional[str] = None

def create_review_summary(file_path, file_content, file_diffs, pr_history, responses):
    """Create a summary of the review including context and suggestions"""
    
    # Get file type and directory context
    file_type = os.path.splitext(file_path)[1].lstrip('.')
    directory = os.path.dirname(file_path)
    
    # Determine if this is a new file
    is_new_file = any(pr.get('context', '').startswith('From similar file:') for pr in pr_history)
    
    # Count issues by type
    issue_types = {
        'style': 0,
        'performance': 0,
        'accessibility': 0,
        'best_practices': 0,
        'security': 0
    }
    
    for response in responses:
        text = response.text.lower()
        if any(word in text for word in ['style', 'format', 'spacing', 'naming']):
            issue_types['style'] += 1
        if any(word in text for word in ['performance', 'slow', 'memory', 'leak']):
            issue_types['performance'] += 1
        if any(word in text for word in ['accessibility', 'a11y', 'aria']):
            issue_types['accessibility'] += 1
        if any(word in text for word in ['practice', 'pattern', 'convention']):
            issue_types['best_practices'] += 1
        if any(word in text for word in ['security', 'vulnerability', 'safe']):
            issue_types['security'] += 1

    # Build summary message
    summary = [
        f"## AI Review Summary for `{file_path}`\n",
        "### Context",
        f"- File Type: `{file_type}`",
        f"- Location: `{directory}`",
        f"- Status: {'New file' if is_new_file else 'Existing file'}"
    ]

    # Add historical context if available
    if pr_history:
        similar_files = [pr['context'].split(': ')[1] for pr in pr_history if 'context' in pr]
        if similar_files:
            summary.append("\n### Historical Context")
            summary.append("Analyzed similar files:")
            summary.extend([f"- `{file}`" for file in similar_files])

    # Add issue summary if issues found
    if responses:
        summary.append("\n### Review Findings")
        summary.append(f"Found {len(responses)} potential issues:")
        for issue_type, count in issue_types.items():
            if count > 0:
                summary.append(f"- {count} {issue_type.replace('_', ' ')} related issues")
                
        summary.append("\nDetailed comments have been added to the relevant lines.")
    else:
        summary.append("\n### Review Findings")
        summary.append("No critical issues found. The code follows established patterns.")

    # Add recommendations
    if responses:
        summary.append("\n### Key Recommendations")
        summary.append("Please review the inline comments for specific details. Key areas to focus on:")
        for issue_type, count in issue_types.items():
            if count > 0:
                if issue_type == 'style':
                    summary.append("- Consider consistent styling and naming conventions")
                elif issue_type == 'performance':
                    summary.append("- Review performance implications of the changes")
                elif issue_type == 'accessibility':
                    summary.append("- Ensure accessibility standards are met")
                elif issue_type == 'best_practices':
                    summary.append("- Align with established project patterns")
                elif issue_type == 'security':
                    summary.append("- Address potential security concerns")

    return "\n".join(summary)

def create_overall_summary(files_reviewed: List[FileReviewData]):
    """Create an overall summary of all files reviewed"""
    
    # Group files by type/directory
    files_by_type = {}
    
    # Track severity counts
    severity_counts = {
        Severity.CRITICAL: 0,
        Severity.HIGH: 0,
        Severity.MEDIUM: 0,
        Severity.LOW: 0
    }
    
    for file_data in files_reviewed:
        # Group by file type
        file_type = os.path.splitext(file_data.file)[1].lstrip('.')
        if file_type not in files_by_type:
            files_by_type[file_type] = []
        files_by_type[file_type].append(file_data)
        
        # Count issues by severity
        for response in file_data.responses:
            severity_counts[response.severity] += 1

    # Build overall summary
    summary = [
        "# 🤖 AI Code Review Summary\n",
        "## Overview"
    ]

    # Add statistics
    total_issues = sum(severity_counts.values())
    files_with_issues = sum(1 for file_data in files_reviewed if file_data.responses)
    
    summary.extend([
        f"- Total files reviewed: {len(files_reviewed)}",
        f"- Files with issues: {files_with_issues}",
        f"- Total issues found: {total_issues}",
        "\n### Issues by Severity",
        f"- {Severity.CRITICAL.value} Critical: {severity_counts[Severity.CRITICAL]}",
        f"- {Severity.HIGH.value} High: {severity_counts[Severity.HIGH]}",
        f"- {Severity.MEDIUM.value} Medium: {severity_counts[Severity.MEDIUM]}",
        f"- {Severity.LOW.value} Low: {severity_counts[Severity.LOW]}\n"
    ])

    # Analyze each file type
    for file_type, files in files_by_type.items():
        summary.append(f"### {file_type.upper()} Files")
        files_list = [f"- `{file_data.file}` ({len(file_data.responses)} issues)" 
                     for file_data in files]
        summary.extend(files_list)
        summary.append("")

    # Only add recommendations if there are issues
    if total_issues > 0:
        # Add overall recommendations
        summary.append("## Overall Recommendations")
        
        # Add file-type specific recommendations only if that type has issues
        if 'js' in files_by_type and any(len(f.responses) > 0 for f in files_by_type['js']):
            summary.append("\n### JavaScript Recommendations")
            js_recs = []
            for file_data in files_by_type['js']:
                for response in file_data.responses:
                    if 'style' in response.text.lower():
                        js_recs.append("- Follow consistent code style and naming conventions")
                    if 'performance' in response.text.lower():
                        js_recs.append("- Optimize performance critical code")
            if js_recs:
                summary.extend(list(set(js_recs)))
        
        if 'css' in files_by_type and any(len(f.responses) > 0 for f in files_by_type['css']):
            summary.append("\n### CSS Recommendations")
            css_recs = []
            for file_data in files_by_type['css']:
                for response in file_data.responses:
                    if 'specificity' in response.text.lower():
                        css_recs.append("- Reduce selector specificity")
                    if 'responsive' in response.text.lower():
                        css_recs.append("- Improve responsive design patterns")
            if css_recs:
                summary.extend(list(set(css_recs)))

    return "\n".join(summary)

def process_single_file(file: str, vars, ai: GPT, pr_history: PRHistory) -> FileReviewData:
    """Process a single file for review"""
    try:
        Log.print_green(f"Processing file: {file}")

        # Check file extension
        _, file_extension = os.path.splitext(file)
        file_extension = file_extension.lstrip('.')
        if file_extension not in vars.target_extensions:
            Log.print_yellow(f"Skipping unsupported extension {file_extension} in file {file}")
            return FileReviewData(file=file, content="", diffs="", history=[], responses=[], success=False)

        # Read file content
        try:
            with open(file, 'r') as file_opened:
                file_content = file_opened.read()
        except FileNotFoundError:
            Log.print_yellow(f"File was removed: {file}")
            return FileReviewData(file=file, content="", diffs="", history=[], responses=[], success=False)

        if len(file_content) == 0:
            Log.print_red(f"File is empty: {file}")
            return FileReviewData(file=file, content="", diffs="", history=[], responses=[], success=False)

        # Get diffs
        file_diffs = Git.get_diff_in_file(
            remote_name=Git.get_remote_name(),
            head_ref=vars.head_ref,
            base_ref=vars.base_ref,
            file_path=file
        )
        if len(file_diffs) == 0:
            Log.print_red("No diffs found in file")
            return FileReviewData(file=file, content="", diffs="", history=[], responses=[], success=False)

        # Get PR history
        file_history = pr_history.get_relevant_prs(file)
        Log.print_green(f"Found {len(file_history)} relevant historical PRs for {file}")

        # Get AI review
        Log.print_green(f"Requesting AI review for {file}")
        response = ai.ai_request_diffs(
            code=file_content,
            diffs=file_diffs,
            file_path=file,
            pr_history=file_history
        )

        responses = []
        if not AiBot.is_no_issues_text(response):
            responses = AiBot.split_ai_response(response)

        return FileReviewData(
            file=file,
            content=file_content,
            diffs=file_diffs,
            history=file_history,
            responses=responses
        )

    except Exception as e:
        Log.print_red(f"Error processing {file}: {str(e)}")
        return FileReviewData(
            file=file,
            content="",
            diffs="",
            history=[],
            responses=[],
            success=False,
            error=str(e)
        )

def post_review_comments(github: GitHub, files_reviewed: List[FileReviewData]) -> None:
    """Post all review comments for processed files"""
    # Track which lines we've already commented on for each file
    commented_lines = {}
    
    for file_data in files_reviewed:
        if not file_data.success:
            continue
            
        commented_lines[file_data.file] = set()
        
        # Post individual comments
        for response_item in file_data.responses:
            if response_item.line:
                # Skip if we already commented on this line
                if response_item.line in commented_lines[file_data.file]:
                    continue
                    
                # Try to post as line comment first
                result = post_line_comment(
                    github=github, 
                    file=file_data.file, 
                    text=response_item.text, 
                    line=response_item.line, 
                    severity=response_item.severity,
                    files_reviewed=files_reviewed  # Pass the files_reviewed list
                )
                
                if result:
                    # Track that we commented on this line
                    commented_lines[file_data.file].add(response_item.line)
                else:
                    # If line comment fails, post as general comment
                    post_general_comment(
                        github=github, 
                        file=file_data.file, 
                        text=f"Line {response_item.line}: {response_item.text}"
                    )
            else:
                # Only post general comments that aren't tied to specific lines
                post_general_comment(github=github, file=file_data.file, text=response_item.text)

def main():
    try:
        # Initialize logging first
        LogManager.init_log()
        LogManager.write_log("Starting AI PR Review\n")
        
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

        # Initialize PR history
        pr_history = PRHistory(vars.token, vars.owner, vars.repo)

        # Process files sequentially instead of in parallel
        Log.print_green(f"Processing {len(changed_files)} files sequentially...")
        files_reviewed = []
        
        for file in changed_files:
            try:
                result = process_single_file(file, vars, ai, pr_history)
                files_reviewed.append(result)
                Log.print_green(f"Completed review for {file}")
            except Exception as e:
                Log.print_red(f"Error processing {file}: {str(e)}")
                files_reviewed.append(FileReviewData(
                    file=file,
                    content="",
                    diffs="",
                    history=[],
                    responses=[],
                    success=False,
                    error=str(e)
                ))

        # Post line-specific comments
        post_review_comments(github, files_reviewed)

        # Create and post single overall summary
        overall_summary = create_overall_summary(files_reviewed)
        post_general_comment(github=github, file="", text=overall_summary)

        Log.print_green("AI Review process completed successfully")

    except Exception as e:
        Log.print_red(f"Error in main: {str(e)}")
    finally:
        LogManager.close_log()
        
        # Print the log file location for debugging
        log_path = LogManager.get_log_path()
        if log_path:
            print(f"Log file location: {log_path}")

def post_line_comment(github: GitHub, file: str, text: str, line: int, severity: Severity, files_reviewed: List[FileReviewData]) -> bool:
    # Add severity emoji to the start of the comment
    text_with_severity = f"{severity.value} {text}"
    
    Log.print_green("Posting line", file, line, text_with_severity)
    try:
        # 1) Retrieve the unified diff from wherever you stored it
        file_review_data = next((f for f in files_reviewed if f.file == file), None)
        if not file_review_data:
            Log.print_red("No review data found for", file)
            return False
        
        # 2) Convert AI line to GitHub diff position
        #    If it's a newly created file, you might pass is_new_file=True
        #    e.g. if file_review_data.history suggests it's new
        is_new_file = False  # or compute it
        position = compute_diff_position(
            diff_text=file_review_data.diffs, 
            ai_line=line,
            is_new_file=is_new_file
        )
        if position == 0:
            Log.print_red("Unable to find correct diff position for line", line)
            return False
        
        # 3) Use the position in the GitHub API call
        commit_id = Git.get_last_commit_sha(file=file)
        git_response = github.post_comment_to_line(
            text=text_with_severity, 
            commit_id=commit_id, 
            file_path=file, 
            line=position  # This is the diff-based position
        )
        Log.print_yellow("Posted", git_response)
        return True

    except RepositoryError as e:
        Log.print_red("Failed line comment", e)
        return False
    except Exception as e:
        Log.print_red("Unexpected error posting line comment", e)
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

def compute_diff_position(diff_text: str, ai_line: int, is_new_file: bool = False) -> int:
    """
    Convert an AI line number (ai_line) into a GitHub diff-based 'position'.
    diff_text is the unified diff for a single file. 
    For new files, old lines won't exist, so we just map from the new hunk lines.
    
    Returns the GitHub position within the diff, or 0 if not found.
    """
    # Basic pattern to match hunk headers like: @@ -12,6 +14,7 @@
    hunk_header_pattern = re.compile(r"^@@ -(\d+),?(\d+)? \+(\d+),?(\d+)? @@")
    
    # We'll track how many lines are in the diff so far (GitHub's 'position')
    position_in_diff = 0

    # We'll use these to track the current old/new active line numbers for each hunk
    old_line = 0
    new_line = 0

    # Are we reading lines from within a hunk?
    in_hunk = False

    # For each line in the diff...
    for diff_line in diff_text.splitlines():
        position_in_diff += 1  # Each line in the unified diff is 1 "position"
        
        # Check if line is a hunk header
        match = hunk_header_pattern.match(diff_line)
        if match:
            # Extract hunk ranges
            old_line_start = int(match.group(1))
            new_line_start = int(match.group(3))
            
            old_line = old_line_start
            new_line = new_line_start
            in_hunk = True
            continue
        
        if not in_hunk:
            # We haven't encountered a hunk header yet, so keep going
            continue
        
        if diff_line.startswith('---') or diff_line.startswith('+++'):
            # Usually the file header lines
            continue
        
        # If line starts with '-', it's removed from original
        if diff_line.startswith('-'):
            # Use old_line, but do not increment new_line
            if not is_new_file and old_line == ai_line:
                return position_in_diff
            old_line += 1
        
        # If line starts with '+', it's added
        elif diff_line.startswith('+'):
            # Use new_line, but do not increment old_line
            if is_new_file or new_line == ai_line:
                return position_in_diff
            new_line += 1
        
        # If line starts with neither '-' nor '+', it's context
        else:
            # Mapped to old_line and new_line
            if not is_new_file and old_line == ai_line:
                return position_in_diff
            if is_new_file and new_line == ai_line:
                return position_in_diff
            
            old_line += 1
            new_line += 1

    # If we never found a match, return 0 (or you can pick another sentinel)
    return 0

if __name__ == "__main__":
    try:
        main()
    finally:
        LogManager.close_log()  # Ensure log file is closed even if there's an error
