from abc import ABC, abstractmethod
from ai.line_comment import LineComment

class AiBot(ABC):
    
    __no_response = "No critical issues found"
    __problems = "errors, issues, potential crashes or unhandled exceptions"
    
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

4. BEM Naming and Structure:
   - Follow BEM naming: block__element--modifier
   - Ensure block name matches directory/component name
   - Use consistent element naming across similar blocks
   - Keep modifier names descriptive and consistent
   - Example: .block__element--modifier structure

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
    