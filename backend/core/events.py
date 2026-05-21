from typing import Callable, Dict, List

class EventDispatcher:
    def __init__(self):
        self._listeners: Dict[str, List[Callable]] = {}

    def listen(self, event_name: str, callback: Callable):
        if event_name not in self._listeners:
            self._listeners[event_name] = []
        self._listeners[event_name].append(callback)

    def dispatch(self, event_name: str, *args, **kwargs):
        for callback in self._listeners.get(event_name, []):
            callback(*args, **kwargs)


event_dispatcher = EventDispatcher()