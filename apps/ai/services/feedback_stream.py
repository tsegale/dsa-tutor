import re


class JsonStringFieldStreamer:
    """Pulls one string field's value out of a JSON object while the object
    is still streaming in, so the explanation can be shown as the model
    writes it instead of after the whole response arrives.

    Feed it raw model text chunk by chunk; each feed() returns the newly
    decoded characters of the field's value (escapes resolved), or "" when
    there is nothing new. It stops at the value's closing quote. The full
    response is still parsed and validated separately once the stream ends -
    this only drives the live preview."""

    _ESCAPES = {"n": "\n", "t": "\t", '"': '"', "\\": "\\", "/": "/", "b": "\b", "f": "\f", "r": "\r"}

    def __init__(self, field: str) -> None:
        self._key = re.compile(r'"%s"\s*:\s*"' % re.escape(field))
        self._buffer = ""
        self._cursor: int | None = None
        self.done = False

    def feed(self, chunk: str) -> str:
        self._buffer += chunk
        if self.done:
            return ""
        if self._cursor is None:
            match = self._key.search(self._buffer)
            if match is None:
                return ""
            self._cursor = match.end()

        out: list[str] = []
        i = self._cursor
        buffer = self._buffer
        while i < len(buffer):
            char = buffer[i]
            if char == "\\":
                if i + 1 >= len(buffer):
                    break  # escape split across chunks - wait for the rest
                code = buffer[i + 1]
                if code == "u":
                    if i + 6 > len(buffer):
                        break
                    try:
                        out.append(chr(int(buffer[i + 2 : i + 6], 16)))
                    except ValueError:
                        out.append(buffer[i : i + 6])
                    i += 6
                    continue
                out.append(self._ESCAPES.get(code, code))
                i += 2
                continue
            if char == '"':
                self.done = True
                i += 1
                break
            out.append(char)
            i += 1
        self._cursor = i
        return "".join(out)
