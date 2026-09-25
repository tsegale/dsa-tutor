import re
from collections.abc import Callable


class JsonStringFieldStreamer:
    """Pulls one string field's value out of a JSON object while the object
    is still streaming in.

    Feed it raw model text chunk by chunk; each feed() returns the newly
    decoded characters of the field's value (escapes resolved), or "" when
    there is nothing new. `done` turns true at the value's closing quote.
    Nothing here is shown to a student directly - see SentenceGate."""

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


# A sentence ends at . ! or ? followed by whitespace. "3.5" never splits
# (no whitespace after the dot); a trailing sentence is only confirmed when
# the field closes.
_SENTENCE_END = re.compile(r"[.!?]\s+")


class SentenceGate:
    """Releases the streamed explanation one whole, validated sentence at a
    time, so no character reaches the student before it has been checked.

    check(sentence) returns a rule name if the sentence breaks a rule that
    can be judged on its own (self-correction marker, foreign notation),
    else None. max_sentences caps how many sentences are released. The gate
    closes on the first failure or at the cap: `released` is then exactly
    the text the student has seen, and becomes the final explanation - it
    is never replaced, because every part of it already passed.
    """

    def __init__(self, check: Callable[[str], str | None], max_sentences: int) -> None:
        self._check = check
        self._max = max_sentences
        self._pending = ""
        self.released: list[str] = []
        self.failure: str | None = None
        self.closed = False

    @property
    def text(self) -> str:
        return " ".join(self.released)

    def _admit(self, sentence: str) -> str | None:
        sentence = sentence.strip()
        if not sentence:
            return None
        if len(self.released) >= self._max:
            self.failure = "sentences"
            self.closed = True
            return None
        why = self._check(sentence)
        if why is not None:
            self.failure = why
            self.closed = True
            return None
        self.released.append(sentence)
        return sentence

    def feed(self, text: str) -> list[str]:
        """Takes newly decoded field text; returns the sentences to reveal now."""
        if self.closed:
            return []
        self._pending += text
        out: list[str] = []
        while not self.closed:
            match = _SENTENCE_END.search(self._pending)
            if match is None:
                break
            sentence, self._pending = self._pending[: match.end()], self._pending[match.end() :]
            admitted = self._admit(sentence)
            if admitted is not None:
                out.append(admitted)
        return out

    def finish(self) -> list[str]:
        """The field closed: judge the final, unterminated sentence."""
        if self.closed:
            return []
        self.closed = True
        admitted = self._admit(self._pending)
        self._pending = ""
        return [admitted] if admitted is not None else []
