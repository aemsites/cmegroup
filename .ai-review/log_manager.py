class LogManager:
    __log_file = None
    __log_path = "ai_review.log"  # The actual log file path

    @classmethod
    def init_log(cls):
        """Initialize the log file"""
        try:
            cls.__log_file = open(cls.__log_path, 'w')
        except Exception as e:
            print(f"Error initializing log file: {e}")

    @classmethod
    def write_log(cls, message, print_to_console=True):
        """Write to log file and optionally print to console"""
        # Write to file
        if cls.__log_file:
            cls.__log_file.write(message)
            cls.__log_file.flush()
        
        # Print to console if requested
        if print_to_console:
            print(message, flush=True)  # flush=True ensures immediate output

    @classmethod
    def close_log(cls):
        """Close the log file"""
        if cls.__log_file:
            cls.__log_file.close() 