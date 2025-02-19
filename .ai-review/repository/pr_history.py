from github import Github
from log import Log
import os

class PRHistory:
    def __init__(self, token, repo_owner, repo_name):
        self.g = Github(token)
        self.repo = self.g.get_repo(f"{repo_owner}/{repo_name}")
        
    def get_relevant_prs(self, file_path, limit=5):
        """Get recent PRs that modified the given file or similar files in the same directory"""
        try:
            relevant_prs = []
            
            # If file is new (doesn't exist in main branch), look at similar files
            if self._is_new_file(file_path):
                Log.print_green(f"New file detected: {file_path}")
                similar_files = self._get_similar_files(file_path)
                Log.print_green(f"Found {len(similar_files)} similar files in the same directory")
                
                # Get PRs for each similar file
                for similar_file in similar_files:
                    similar_prs = self._search_file_prs(similar_file, limit)
                    for pr in similar_prs:
                        pr['context'] = f"From similar file: {similar_file}"
                    relevant_prs.extend(similar_prs)
            else:
                # Get PRs for the specific file
                relevant_prs = self._search_file_prs(file_path, limit)
                
            return relevant_prs
            
        except Exception as e:
            Log.print_yellow(f"Error fetching PR history: {str(e)}")
            return []

    def _is_new_file(self, file_path):
        """Check if the file is new by looking for it in the main branch"""
        try:
            self.repo.get_contents(file_path, ref="main")
            return False
        except Exception:
            return True

    def _get_similar_files(self, file_path):
        """Find similar files in the same directory with the same extension"""
        try:
            # Get the directory and file extension
            directory = os.path.dirname(file_path)
            _, file_extension = os.path.splitext(file_path)
            
            # Get all files in the directory
            contents = self.repo.get_contents(directory, ref="main")
            
            # Filter for files with the same extension
            similar_files = [
                content.path for content in contents 
                if isinstance(content, (str, bytes)) == False  # Filter out non-file objects
                and os.path.splitext(content.path)[1] == file_extension
            ]
            
            return similar_files
            
        except Exception as e:
            Log.print_yellow(f"Error finding similar files: {str(e)}")
            return []

    def _search_file_prs(self, file_path, limit):
        """Search for PRs that modified a specific file"""
        query = f"repo:{self.repo.full_name} is:pr is:merged path:{file_path}"
        prs = self.g.search_issues(query)
        
        relevant_prs = []
        for pr in prs[:limit]:
            pr_data = self.repo.get_pull(pr.number)
            relevant_prs.append({
                'number': pr.number,
                'title': pr.title,
                'body': pr.body,
                'comments': self._get_pr_comments(pr_data),
                'changes': self._get_file_changes(pr_data, file_path)
            })
        return relevant_prs

    def _get_pr_comments(self, pr):
        """Get all comments from a PR"""
        comments = []
        try:
            # Get review comments (inline comments)
            for comment in pr.get_review_comments():
                comments.append({
                    'body': comment.body,
                    'path': comment.path,
                    'line': comment.line
                })
            
            # Get issue comments (general PR comments)
            for comment in pr.get_issue_comments():
                comments.append({
                    'body': comment.body,
                    'path': None,
                    'line': None
                })
        except Exception as e:
            Log.print_yellow(f"Error fetching PR comments: {str(e)}")
        
        return comments

    def _get_file_changes(self, pr, file_path):
        """Get the changes made to the specific file in the PR"""
        try:
            for file in pr.get_files():
                if file.filename == file_path:
                    return {
                        'patch': file.patch,
                        'status': file.status
                    }
        except Exception as e:
            Log.print_yellow(f"Error fetching file changes: {str(e)}")
        return None 