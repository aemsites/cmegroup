from abc import ABC, abstractmethod
from ai.line_comment import LineComment

class AiBot(ABC):
    
    __no_response = "No critical issues found"
    __problems = "errors, issues, potential crashes or unhandled exceptions"
    
    __css_specific_checks = """
For CSS files, check for:
1. Usage of px instead of rem/em - suggest converting to rem
2. Hardcoded color values (#hex or rgb) that should use CSS variables
3. Missing responsive design patterns
4. Inconsistent spacing units
5. Specificity issues or overly specific selectors
6. Missing vendor prefixes for cross-browser compatibility
7. Unused or redundant CSS rules
8. Z-index stacking context issues
9. Accessibility concerns (color contrast, focus states)
10. BEM naming convention violations
"""

    __js_specific_checks = """
For JavaScript files, check for:
1. Code Modularity:
   - Functions should be single-responsibility
   - Reusable logic should be in helper functions
   - Check for opportunities to use utils.js helpers

2. Code Quality:
   - No hard-coded values (use constants or config)
   - Proper error handling
   - Clear and consistent naming
   - Function documentation
   - Meaningful variable names

3. Performance:
   - Memory leaks (event listeners, DOM references)
   - Unnecessary DOM operations
   - Efficient DOM queries
   - Browser compatibility issues

4. Best Practices:
   - Use established patterns from similar components
   - Follow project conventions
   - Proper event handling
   - Accessibility considerations
   - Security best practices

5. Utils.js Integration:
   - Check for duplicate functionality that exists in utils.js
   - Suggest using existing helper methods
   - Identify opportunities for new helper methods
"""

    __historical_context_template = """
Historical Context from Previous PRs:
{historical_context}

Key Patterns Observed:
1. Accepted Changes: Changes that were approved in previous PRs
2. Rejected Patterns: Changes that were requested to be modified
3. Common Feedback: Recurring review comments
"""

    __chat_gpt_ask_long = """
Could you review the following code with given git diffs for {problems}?
Please format issues as: "line_number : description of the issue and suggested fix"
If there are no issues, respond with "{no_response}".

{historical_context}

File type specific checks to include:
{specific_checks}

DIFFS:

{diffs}

Full code from the file:

{code}
"""

    @abstractmethod
    def ai_request_diffs(self, code, diffs) -> str:
        pass

    @staticmethod
    def _format_historical_context(pr_history):
        if not pr_history:
            return ""
            
        context = ["Previous PR History:"]
        patterns = {
            'accepted': set(),
            'rejected': set(),
            'feedback': set(),
            'similar_files': set()  # New category for similar file patterns
        }
        
        for pr in pr_history:
            # Note if this PR is from a similar file
            is_similar = 'context' in pr and 'From similar file:' in pr['context']
            pattern_category = 'similar_files' if is_similar else 'feedback'
            
            # Extract patterns from comments
            for comment in pr.get('comments', []):
                if 'approved' in comment['body'].lower():
                    patterns['accepted'].add(
                        f"{comment['body']} {pr['context'] if is_similar else ''}"
                    )
                elif 'request changes' in comment['body'].lower():
                    patterns['rejected'].add(
                        f"{comment['body']} {pr['context'] if is_similar else ''}"
                    )
                else:
                    patterns[pattern_category].add(
                        f"{comment['body']} {pr['context'] if is_similar else ''}"
                    )
        
        # Format the context
        if patterns['accepted']:
            context.append("\nAccepted Patterns:")
            context.extend([f"- {p}" for p in patterns['accepted']])
            
        if patterns['rejected']:
            context.append("\nRejected Patterns:")
            context.extend([f"- {p}" for p in patterns['rejected']])
            
        if patterns['feedback']:
            context.append("\nCommon Feedback:")
            context.extend([f"- {p}" for p in patterns['feedback']])
            
        if patterns['similar_files']:
            context.append("\nPatterns from Similar Files:")
            context.extend([f"- {p}" for p in patterns['similar_files']])
            
        return "\n".join(context)

    @staticmethod
    def build_ask_text(code, diffs, file_path, pr_history=None) -> str:
        # Determine file type specific checks based on extension
        file_extension = file_path.split('.')[-1].lower()
        specific_checks = ""
        
        if file_extension == 'css':
            specific_checks = AiBot.__css_specific_checks
        elif file_extension == 'js':
            specific_checks = AiBot.__js_specific_checks
            
        historical_context = AiBot._format_historical_context(pr_history) if pr_history else ""
            
        return AiBot.__chat_gpt_ask_long.format(
            problems=AiBot.__problems,
            no_response=AiBot.__no_response,
            specific_checks=specific_checks,
            historical_context=historical_context,
            diffs=diffs,
            code=code,
        )

    @staticmethod
    def is_no_issues_text(source: str) -> bool:
        target = AiBot.__no_response.replace(" ", "")
        source_no_spaces = source.replace(" ", "")
        return source_no_spaces.startswith(target)
    
    @staticmethod
    def split_ai_response(input) -> list[LineComment]:
        if input is None or not input:
            return []
        
        lines = input.strip().split("\n")
        models = []

        for full_text in lines:
            number_str = ''
            number = 0
            full_text = full_text.strip()
            if len(full_text) == 0:
                continue

            reading_number = True
            for char in full_text.strip():
                if reading_number:
                    if char.isdigit():
                        number_str += char
                    else:
                        break

            if number_str:
                number = int(number_str)

            models.append(LineComment(line=number, text=full_text))
        return models
    