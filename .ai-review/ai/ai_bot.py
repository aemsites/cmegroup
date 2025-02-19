from abc import ABC, abstractmethod
from ai.line_comment import LineComment
from ai.line_comment import Severity
import json
from typing import List
from log import Log

class AiBot(ABC):
    
    __no_response = "No critical issues found"
    __problems = "Review the code changes using specific checks mentioned below and also use historical context from previous PRs"
    
    __css_specific_checks = """
For CSS files, check for:
1. Responsive Design:
   - Ensure mobile-first approach is followed
   - Default styles should target mobile/smaller screens
   - Media queries should use the format: @media (width >= Xpx)
   - Media query breakpoints should be consistent (900px, 1200px etc.)
   - Avoid max-width queries unless absolutely necessary

2. Selector Scoping:
   - Always use proper parent block selectors to avoid collisions
   - For blocks, start with the block name as parent (e.g., '.hero', '.modal')
   - For variants, include both block and variant (e.g., '.cta.promo')
   - Ensure child elements are properly scoped (e.g., '.cta.promo .button')
   - Avoid generic class names without parent scoping
   - Check for potential selector conflicts with other blocks

3. Units and Values:
   - Use rem/em instead of px for better accessibility
   - Use CSS variables for colors instead of hex/rgb values
   - Use CSS variables for consistent spacing
   - Maintain consistent unit usage (rem for typography, px for borders)

4. Naming and Structure:
   - Ensure block name matches directory/component name
   - Use consistent element naming across similar blocks
   - Keep modifier names descriptive and consistent

5. Specificity and Nesting:
   - Minimize selector specificity
   - Maximum 3 levels of nesting
   - Avoid ID selectors (#id)
   - Use classes over element selectors
   - Group related properties logically
   - Order selectors from least to most specific

6. Performance:
   - Avoid redundant CSS rules
   - Check for unused selectors
   - Optimize z-index stacking context
   - Consider CSS property order for performance
   - Minimize selector chain length

7. Accessibility:
   - Ensure sufficient color contrast
   - Check focus states for interactive elements
   - Verify hover/active states
   - Support reduced motion preferences

8. Cross-browser:
   - Add necessary vendor prefixes
   - Check flexbox/grid fallbacks
   - Ensure consistent rendering across browsers

9. Project Conventions:
   - Use established class naming patterns
   - Follow project's CSS architecture
   - Maintain consistent file structure
   - Use shared utility classes when available
   - Follow established block patterns

10. Common Issues to Check:
    - Incorrect media query format (should be: @media (width >= Xpx))
    - Non-mobile-first approach
    - Hard-coded values instead of variables
    - Inconsistent spacing or typography
    - Missing responsive adjustments
    - Unscoped selectors that could cause conflicts
    - Missing parent block selectors
    - Generic class names without proper scoping

Example of proper selector scoping:
✅ Good:
.block-name {
  /* Base styles */
}
.block-name.variant {
  /* Variant styles */
}
.block-name .element {
  /* Scoped element styles */
}

❌ Bad:
.element { /* Too generic, no parent scope */
.variant { /* Missing block name */
.button { /* Generic, could conflict */
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
Task: {problems}
Historical context: {historical_context}
If there are no issues, respond with "{no_response}".

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
        
        for pr in pr_history:
            # Process discussion threads
            for thread in pr.get('discussion_threads', []):
                original = thread['original_comment']
                resolution = thread['resolution']
                
                if resolution:
                    resolution_type, resolution_text = resolution
                    
                    # Format based on resolution type
                    if resolution_type == 'resolved':
                        context.append(f"\n✅ Resolved Discussion:")
                    elif resolution_type == 'agreed':
                        context.append(f"\n👍 Agreed Upon:")
                    elif resolution_type == 'acknowledged':
                        context.append(f"\n📝 Acknowledged:")
                    
                    context.extend([
                        f"Issue raised: {original['body']}",
                        f"Resolution: {resolution_text}",
                        f"File: {original['file']}"
                    ])
                    
                    # Add any significant replies
                    significant_replies = [
                        r for r in thread['replies']
                        if r['reactions'].get('+1', 0) > 0
                    ]
                    if significant_replies:
                        context.append("Key responses:")
                        for reply in significant_replies:
                            context.append(f"- {reply['body']}")
        
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
        if input is None or not input or input.strip() == AiBot.__no_response:
            return []
        
        models = []
        
        try:
            # Try to parse as JSON
            issues = json.loads(input)
            
            if not isinstance(issues, list):
                Log.print_yellow("Warning: Expected JSON array in response")
                return []
                
            severity_map = {
                "CRITICAL": Severity.CRITICAL,
                "HIGH": Severity.HIGH,
                "MEDIUM": Severity.MEDIUM,
                "LOW": Severity.LOW
            }
            
            for issue in issues:
                try:
                    # Validate required fields
                    if not all(k in issue for k in ['line', 'severity', 'issue', 'suggestion']):
                        Log.print_yellow(f"Warning: Missing required fields in issue: {issue}")
                        continue
                        
                    # Get severity enum
                    severity = severity_map.get(issue['severity'].upper(), Severity.MEDIUM)
                    
                    # Format the comment text
                    text = (
                        f"{issue['line']} [{issue['severity']}] : {issue['issue']}\n"
                        f"    Suggested fix: {issue['suggestion']}"
                    )
                    
                    models.append(LineComment(
                        line=int(issue['line']),
                        text=text,
                        severity=severity
                    ))
                    
                except Exception as e:
                    Log.print_yellow(f"Error processing issue: {str(e)}")
                    continue
                    
        except json.JSONDecodeError:
            # Fallback to old format parsing if not JSON
            Log.print_yellow("Warning: Response is not valid JSON, falling back to text parsing")
            return AiBot._parse_text_format(input)
            
        return models
        
    @staticmethod
    def _parse_text_format(input: str) -> list[LineComment]:
        """Fallback parser for old text format"""
        # Split by double newlines to separate different issues
        issues = input.strip().split("\n")
        models = []

        severity_map = {
            "CRITICAL": Severity.CRITICAL,
            "HIGH": Severity.HIGH,
            "MEDIUM": Severity.MEDIUM,
            "LOW": Severity.LOW
        }

        for issue in issues:
            issue = issue.strip()
            if not issue or issue == AiBot.__no_response:
                continue

            # Extract line number
            number_str = ''
            for char in issue:
                if char.isdigit():
                    number_str += char
                else:
                    break
            
            if not number_str:
                continue
                
            line = int(number_str)
            
            # Extract severity - if not found, default to MEDIUM
            severity = Severity.MEDIUM
            for sev_text, sev_enum in severity_map.items():
                if f"[{sev_text}]" in issue:
                    severity = sev_enum
                    break
            
            # If no severity marker found, log it
            if "[" not in issue:
                Log.print_yellow(f"Warning: No severity marker found in response: {issue}")
                # Add severity marker to the text
                parts = issue.split(":", 1)
                if len(parts) == 2:
                    issue = f"{parts[0]} [MEDIUM]:{parts[1]}"

            models.append(LineComment(
                line=line,
                text=issue,
                severity=severity
            ))
            
        return models
    