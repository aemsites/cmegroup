from github import Github
from log import Log
import os

class PRHistory:
    def __init__(self, token, repo_owner, repo_name):
        self.g = Github(token)
        self.repo = self.g.get_repo(f"{repo_owner}/{repo_name}")
        self._cached_prs = None  # Cache for merged PRs
        
    def _get_merged_prs(self):
        """Get and cache merged PRs"""
        if self._cached_prs is None:
            Log.print_green("Fetching all merged PRs (this will be cached)...")
            merged_prs = self.repo.get_pulls(state='closed', sort='updated', direction='desc')
            self._cached_prs = [pr for pr in merged_prs if pr.merged]
            Log.print_green(f"Cached {len(self._cached_prs)} merged PRs")
        return self._cached_prs

    def get_relevant_prs(self, file_path, limit=5):
        """Get recent PRs that modified the given file or similar files in the same directory"""
        try:
            relevant_prs = []
            
            # If file is new (doesn't exist in main branch), look at similar files
            if self._is_new_file(file_path):
                Log.print_green(f"New file detected: {file_path}")
                similar_files = self._get_similar_files(file_path)
                Log.print_green(f"Similar files: {similar_files}")
                if similar_files:  # Only proceed if similar files found
                    Log.print_green(f"Found {len(similar_files)} similar files in the same directory")
                    
                    # Get PRs for each similar file
                    merged_prs = self._get_merged_prs()  # Use cached PRs
                    for similar_file in similar_files:
                        try:
                            Log.print_green(f"Searching PRs that modified {similar_file}")
                            
                            # Check each PR's files
                            pr_count = 0
                            for pr in merged_prs:
                                if pr_count >= limit:
                                    break
                                    
                                try:
                                    Log.print_green(f"Checking PR #{pr.number} for {similar_file}")
                                    files_changed = [f.filename for f in pr.get_files()]
                                    
                                    if similar_file in files_changed:
                                        relevant_prs.append({
                                            'number': pr.number,
                                            'title': pr.title,
                                            'body': pr.body,
                                            'comments': self._get_pr_comments(pr),
                                            'changes': self._get_file_changes(pr, similar_file),
                                            'context': f"From similar file: {similar_file}"
                                        })
                                        Log.print_green(f"Found changes to {similar_file} in PR #{pr.number}")
                                        pr_count += 1
                                        
                                except Exception as e:
                                    Log.print_yellow(f"Error checking PR {pr.number}: {str(e)}")
                                    continue
                                    
                        except Exception as e:
                            Log.print_yellow(f"Error fetching PRs for similar file {similar_file}: {str(e)}")
                            continue
            else:
                # Get PRs for the specific file
                relevant_prs = self._search_file_prs(file_path, limit)
                
            Log.print_green(f"Total relevant PRs found: {len(relevant_prs)}")
            if len(relevant_prs) > 0:
                Log.print_green("Found PRs:")
                for pr in relevant_prs:
                    Log.print_green(f"- PR #{pr['number']}: {pr['title']}")
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
        """Find similar files in the blocks directory with the same extension"""
        try:
            # Get the directory and file extension
            directory = os.path.dirname(file_path)
            _, file_extension = os.path.splitext(file_path)
            
            # If it's a new block, look in the blocks directory
            if 'blocks/' in directory:
                try:
                    # Get the blocks directory
                    blocks_dir = 'blocks'
                    contents = self.repo.get_contents(blocks_dir, ref="main")
                    
                    # Recursively get all files in blocks directory
                    similar_files = []
                    for content in contents:
                        if isinstance(content, (str, bytes)):
                            continue  # Skip non-file objects
                        if content.type == 'dir':
                            try:
                                # Get files in each block directory
                                block_contents = self.repo.get_contents(content.path, ref="main")
                                for block_file in block_contents:
                                    if isinstance(block_file, (str, bytes)):
                                        continue
                                    if os.path.splitext(block_file.path)[1] == file_extension:
                                        similar_files.append(block_file.path)
                            except Exception as e:
                                Log.print_yellow(f"Error accessing block directory {content.path}: {str(e)}")
                                continue
                    
                    return similar_files
                except Exception as e:
                    Log.print_yellow(f"Error accessing blocks directory: {str(e)}")
                    return []
            else:
                # For non-block files, use original directory search
                try:
                    contents = self.repo.get_contents(directory, ref="main")
                    similar_files = [
                        content.path for content in contents 
                        if not isinstance(content, (str, bytes))
                        and os.path.splitext(content.path)[1] == file_extension
                    ]
                    return similar_files
                except Exception as e:
                    Log.print_yellow(f"Error searching directory {directory}: {str(e)}")
                    return []
                
        except Exception as e:
            Log.print_yellow(f"Error finding similar files: {str(e)}")
            return []

    def _search_file_prs(self, file_path, limit):
        """Search for PRs that modified a specific file"""
        try:
            Log.print_green(f"Searching PRs that modified {file_path}")
            relevant_prs = []
            
            # Use cached PRs
            merged_prs = self._get_merged_prs()
            
            # Check each PR's files
            for pr in merged_prs:
                if len(relevant_prs) >= limit:
                    break
                    
                try:
                    Log.print_green(f"Checking PR #{pr.number} for {file_path}")
                    files_changed = [f.filename for f in pr.get_files()]
                    
                    if file_path in files_changed:
                        relevant_prs.append({
                            'number': pr.number,
                            'title': pr.title,
                            'body': pr.body,
                            'comments': self._get_pr_comments(pr),
                            'changes': self._get_file_changes(pr, file_path)
                        })
                        Log.print_green(f"Found changes to {file_path} in PR #{pr.number}")
                        
                except Exception as e:
                    Log.print_yellow(f"Error checking PR {pr.number}: {str(e)}")
                    continue
            
            Log.print_green(f"Found {len(relevant_prs)} PRs that modified {file_path}")
            return relevant_prs
            
        except Exception as e:
            Log.print_yellow(f"Error searching PRs for {file_path}: {str(e)}")
            return []

    def _get_pr_comments(self, pr):
        """Get all comments from a PR"""
        comments = []
        try:
            # Get review comments (inline comments)
            for comment in pr.get_review_comments():
                try:
                    comments.append({
                        'body': comment.body,
                        'path': comment.path if hasattr(comment, 'path') else None,
                        'line': comment.position if hasattr(comment, 'position') else None
                    })
                except Exception as e:
                    Log.print_yellow(f"Error processing review comment: {str(e)}")
                    continue
            
            # Get issue comments (general PR comments)
            for comment in pr.get_issue_comments():
                try:
                    comments.append({
                        'body': comment.body,
                        'path': None,
                        'line': None
                    })
                except Exception as e:
                    Log.print_yellow(f"Error processing issue comment: {str(e)}")
                    continue

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