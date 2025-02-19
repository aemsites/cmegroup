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

separator = "\n\n----------------------------------------------------------------------\n\n"
log_file = open('output.txt', 'a')

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

def create_overall_summary(pr_title, pr_description, files_reviewed):
    """Create an overall summary of all files reviewed"""
    
    # Group files by type/directory
    files_by_type = {}
    for file_data in files_reviewed:
        file_type = os.path.splitext(file_data['file'])[1].lstrip('.')
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
    total_issues = sum(len(file_data['responses']) for file_data in files_reviewed)
    files_with_issues = sum(1 for file_data in files_reviewed if file_data['responses'])
    
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
        
        # Collect common issues for this file type
        type_issues = defaultdict(int)
        for file_data in files:
            for response in file_data['responses']:
                text = response.text.lower()
                for issue_type, keywords in {
                    'style': ['style', 'format', 'spacing', 'naming'],
                    'performance': ['performance', 'slow', 'memory', 'leak'],
                    'accessibility': ['accessibility', 'a11y', 'aria'],
                    'best_practices': ['practice', 'pattern', 'convention'],
                    'security': ['security', 'vulnerability', 'safe']
                }.items():
                    if any(word in text for word in keywords):
                        type_issues[issue_type] += 1
                        if text not in common_patterns[issue_type]:
                            common_patterns[issue_type].append(text)

        # Add file type summary
        files_list = [f"- `{file_data['file']}` ({len(file_data['responses'])} issues)" 
                     for file_data in files]
        summary.extend(files_list)
        
        if type_issues:
            summary.append("\nCommon issues in this file type:")
            for issue_type, count in type_issues.items():
                if count > 0:
                    summary.append(f"- {count} {issue_type.replace('_', ' ')} related issues")
        summary.append("")

    # Add overall recommendations
    summary.append("## Overall Recommendations")
    
    # Add file-type specific recommendations
    if 'js' in files_by_type:
        summary.append("\n### JavaScript Recommendations")
        summary.extend([
            "- Ensure code modularity and reusability",
            "- Utilize helper methods from utils.js",
            "- Avoid hard-coding values",
            "- Follow established patterns from similar components",
            "- Consider performance implications",
            "- Add proper documentation for functions"
        ])
    
    if 'css' in files_by_type:
        summary.append("\n### CSS Recommendations")
        summary.extend([
            "- Use CSS variables for consistent theming",
            "- Prefer rem/em over px for better accessibility",
            "- Follow BEM naming conventions",
            "- Ensure responsive design patterns",
            "- Minimize specificity issues"
        ])

    # Add common patterns found
    summary.append("\n## Common Patterns Found")
    for pattern_type, patterns in common_patterns.items():
        if patterns:
            summary.append(f"\n### {pattern_type.title()} Patterns")
            summary.extend([f"- {pattern}" for pattern in patterns[:3]])  # Show top 3 patterns

    return "\n".join(summary)

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

    files_reviewed = []
    
    # Get PR details for context
    pr_title = github.get_pr_title()
    pr_description = github.get_pr_description()

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
        
        # Get relevant PR history for this file
        file_history = pr_history.get_relevant_prs(file)
        
        Log.print_green(f"Found {len(file_history)} relevant historical PRs for {file}")
        
        Log.print_green(f"Requesting AI review for {file}. Content Length: {len(file_content)}, Diff Length: {len(file_diffs)}")
        response = ai.ai_request_diffs(
            code=file_content, 
            diffs=file_diffs, 
            file_path=file,
            pr_history=file_history
        )
        Log.print_green(f"Received AI response for {file}. Length: {len(response)}")

        file_data = {
            'file': file,
            'content': file_content,
            'diffs': file_diffs,
            'history': file_history,
            'responses': []
        }

        if not AiBot.is_no_issues_text(response):
            file_data['responses'] = AiBot.split_ai_response(response)
            
            # Post individual comments
            for response_item in file_data['responses']:
                if response_item.line:
                    result = post_line_comment(github=github, file=file, text=response_item.text, line=response_item.line)
                    if not result:
                        result = post_general_comment(github=github, file=file, text=response_item.text)
                else:
                    result = post_general_comment(github=github, file=file, text=response_item.text)
                
                if not result:
                    raise RepositoryError("Failed to post comments")

        # Create and post file summary
        summary = create_review_summary(file, file_content, file_diffs, file_history, file_data['responses'])
        post_general_comment(github=github, file=file, text=summary)
        
        files_reviewed.append(file_data)

    # Create and post overall summary
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