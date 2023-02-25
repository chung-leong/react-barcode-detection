import AbortController from 'abort-controller';
import { EventTarget, Event } from 'event-target-shim';

if (!global.AbortController) {
  global.AbortController = AbortController;
}
if (!global.EventTarget) {
  global.EventTarget = EventTarget;
}
if (!global.Event) {
  global.Event = Event;
}

global.resolve = (path) => {
  return (new URL(path, import.meta.url)).pathname;
};