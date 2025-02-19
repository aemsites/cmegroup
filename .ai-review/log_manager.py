class LogManager:
    _log_file = None

    @classmethod
    def init_log_file(cls, file_path='output.txt'):
        """Initialize the log file"""
        cls._log_file = open(file_path, 'a')

    @classmethod
    def write_log(cls, message):
        """Write to log file and flush immediately"""
        if cls._log_file:
            cls._log_file.write(message)
            cls._log_file.flush()

    @classmethod
    def close_log(cls):
        """Close the log file"""
        if cls._log_file:
            cls._log_file.close() 