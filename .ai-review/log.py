from datetime import datetime

class Log:
    # ANSI escape codes for some colors
    RED = '\033[31m'
    GREEN = '\033[32m'
    YELLOW = '\033[33m'
    RESET = '\033[0m'

    @staticmethod
    def print_red(message, *args):
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        print(f"\033[91m[{timestamp}] {message}", *args, "\033[0m", flush=True)

    @staticmethod
    def print_green(message, *args):
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        print(f"\033[92m[{timestamp}] {message}", *args, "\033[0m", flush=True)

    @staticmethod
    def print_yellow(message, *args):
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        print(f"\033[93m[{timestamp}] {message}", *args, "\033[0m", flush=True)