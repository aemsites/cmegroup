import os
from git import Git 
from pathlib import Path
from ai.gpt import GPT
from ai.ai_bot import AiBot
from log import Log
from env_vars import EnvVars
from repository.github import GitHub
from repository.repository import RepositoryError
from repository.pr_history import PRHistory
from collections import defaultdict
import concurrent.futures
from dataclasses import dataclass
from typing import List, Optional

separator = "\n\n----------------------------------------------------------------------\n\n"
log_file = open('output.txt', 'a')

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

def create_overall_summary(pr_title, pr_description, files_reviewed: List[FileReviewData]):
    """Create an overall summary of all files reviewed"""
    
    # Group files by type/directory
    files_by_type = {}
    for file_data in files_reviewed:
        file_type = os.path.splitext(file_data.file)[1].lstrip('.')
        if file_type not in files_by_type:
            files_by_type[file_type] = []
        files_by_type[file_type].append(file_data)

    # Build overall summary
    summary = [
        "# 🤖 AI Code Review Summary\n",
        f"## PR Context",
        f"**Title:** {pr_title}",
        f"**Description:** {pr_description}\n",
        "## Overview"
    ]

    # Add statistics
    total_issues = sum(len(file_data.responses) for file_data in files_reviewed)
    files_with_issues = sum(1 for file_data in files_reviewed if file_data.responses)
    
    summary.extend([
        f"- Total files reviewed: {len(files_reviewed)}",
        f"- Files with issues: {files_with_issues}",
        f"- Total issues found: {total_issues}\n"
    ])

    # Group common patterns/issues
    common_patterns = {
        'style': [],
        'performance': [],
        'accessibility': [],
        'best_practices': [],
        'security': []
    }

    # Analyze each file type
    for file_type, files in files_by_type.items():
        summary.append(f"### {file_type.upper()} Files")
        
        # Add file list with issue count
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
                    # ... add other specific recommendations based on actual issues
            if js_recs:
                summary.extend(list(set(js_recs)))  # Remove duplicates
        
        if 'css' in files_by_type and any(len(f.responses) > 0 for f in files_by_type['css']):
            summary.append("\n### CSS Recommendations")
            css_recs = []
            for file_data in files_by_type['css']:
                for response in file_data.responses:
                    if 'specificity' in response.text.lower():
                        css_recs.append("- Reduce selector specificity")
                    if 'responsive' in response.text.lower():
                        css_recs.append("- Improve responsive design patterns")
                    # ... add other specific recommendations based on actual issues
            if css_recs:
                summary.extend(list(set(css_recs)))  # Remove duplicates

        # Add common patterns section only if patterns were found
        patterns_found = any(patterns for patterns in common_patterns.values())
        if patterns_found:
            summary.append("\n## Common Patterns Found")
            for pattern_type, patterns in common_patterns.items():
                if patterns:
                    summary.append(f"\n### {pattern_type.title()} Patterns")
                    summary.extend([f"- {pattern}" for pattern in patterns[:3]])

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
    for file_data in files_reviewed:
        if not file_data.success:
            continue

        # Post individual comments
        for response_item in file_data.responses:
            if response_item.line:
                result = post_line_comment(github=github, file=file_data.file, text=response_item.text, line=response_item.line)
                if not result:
                    result = post_general_comment(github=github, file=file_data.file, text=response_item.text)
            else:
                result = post_general_comment(github=github, file=file_data.file, text=response_item.text)

        # Note: Removed individual file summary posting

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

    # Initialize PR history
    pr_history = PRHistory(vars.token, vars.owner, vars.repo)

    # Process files in parallel
    Log.print_green(f"Processing {len(changed_files)} files in parallel...")
    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
        future_to_file = {
            executor.submit(process_single_file, file, vars, ai, pr_history): file
            for file in changed_files
        }

        files_reviewed = []
        for future in concurrent.futures.as_completed(future_to_file):
            file = future_to_file[future]
            try:
                result = future.result()
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
    pr_title = github.get_pr_title()
    pr_description = github.get_pr_description()
    overall_summary = create_overall_summary(pr_title, pr_description, files_reviewed)
    post_general_comment(github=github, file="", text=overall_summary)

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