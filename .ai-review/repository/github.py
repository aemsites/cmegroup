import requests
from repository.repository import Repository, RepositoryError

class GitHub(Repository):

    def __init__(self, token, repo_owner, repo_name, pull_number):
        self.token = token
        self.repo_owner = repo_owner
        self.repo_name = repo_name
        self.pull_number = pull_number
        self.__header_accept_json = { "Authorization": f"token {token}" }
        self.__header_authorization = { "Accept": "application/vnd.github.v3+json" }
        self.__url_add_comment = f"https://api.github.com/repos/{repo_owner}/{repo_name}/pulls/{pull_number}/comments"
        self.__url_add_issue = f"https://api.github.com/repos/{repo_owner}/{repo_name}/issues/{pull_number}/comments"

    def post_comment_to_line(self, text, commit_id, file_path, line):
        headers = self.__header_accept_json | self.__header_authorization
        body = {
            "body": text,
            "commit_id": commit_id,
            "path" : file_path,
            "position" : line
        }
        response = requests.post(self.__url_add_comment, json = body, headers = headers)
        if response.status_code == 200 or response.status_code == 201:
            return response.json()
        else:
            raise RepositoryError(f"Error with line comment {response.status_code} : {response.text}")
        
    def post_comment_general(self, text):
        headers = self.__header_accept_json | self.__header_authorization
        body = {
            "body": text
        }
        response = requests.post(self.__url_add_issue, json = body, headers = headers)
        if response.status_code == 200 or response.status_code == 201:
            return response.json()
        else:
            raise RepositoryError(f"Error with general comment {response.status_code} : {response.text}")
        
    def get_pr_title(self):
        """Get the PR title"""
        url = f"https://api.github.com/repos/{self.repo_owner}/{self.repo_name}/pulls/{self.pull_number}"
        headers = self.__header_accept_json | self.__header_authorization
        response = requests.get(url, headers=headers)
        if response.status_code == 200:
            return response.json().get('title', '')
        return ''

    def get_pr_description(self):
        """Get the PR description"""
        url = f"https://api.github.com/repos/{self.repo_owner}/{self.repo_name}/pulls/{self.pull_number}"
        headers = self.__header_accept_json | self.__header_authorization
        response = requests.get(url, headers=headers)
        if response.status_code == 200:
            return response.json().get('body', '')
        return ''
        