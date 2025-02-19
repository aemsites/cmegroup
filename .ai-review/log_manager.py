import os

class LogManager:
    __log_file = None
    __log_path = None  # Will be set in init_log
    
    @classmethod
    def init_log(cls):
        """Initialize the log file"""
        try:
            # Get the GitHub workspace directory (where the action runs)
            workspace = os.getenv('GITHUB_WORKSPACE', os.getcwd())
            
            # Create logs directory if it doesn't exist
            logs_dir = os.path.join(workspace, '.ai-review', 'logs')
            os.makedirs(logs_dir, exist_ok=True)
            
            # Set the full path for the log file
            cls.__log_path = os.path.join(logs_dir, 'ai_review.log')
            
            # Open the log file
            cls.__log_file = open(cls.__log_path, 'w', encoding='utf-8')
            print(f"Log file initialized at: {cls.__log_path}")
            
        except Exception as e:
            print(f"Error initializing log file: {e}")
    
    @classmethod
    def get_log_path(cls):
        """Get the current log file path"""
        return cls.__log_path

    @classmethod
    def write_log(cls, message, print_to_console=True):
        """Write to log file and optionally print to console"""
        try:
            # Write to file
            if cls.__log_file:
                cls.__log_file.write(message)
                cls.__log_file.flush()
            else:
                print("Warning: Log file not initialized")
            
            # Print to console if requested
            if print_to_console:
                print(message, flush=True)
                
        except Exception as e:
            print(f"Error writing to log: {e}")

    @classmethod
    def close_log(cls):
        """Close the log file"""
        if cls.__log_file:
            cls.__log_file.close() 