"""Rejects feedback that gives away the right answer while the student can
still try again.

Every deterministically graded junction now sends the model the text of the
option the student chose, and a count question sends the measured count.
The prompt forbids stating the right option on a wrong answer, but a prompt
rule is not a guarantee, so each feedback field (and each streamed sentence,
before it is shown) is checked here against the right option's text and, for
a count question, its value.
"""

import re
from collections.abc import Callable

_STOPWORDS = {
    "the", "a", "an", "and", "or", "of", "to", "in", "on", "for", "is", "are",
    "this", "that", "it", "at", "by", "with", "as", "if", "then", "its", "now",
    "was", "were", "be", "has", "have", "into", "from", "their", "there", "than",
}
_NUMBER_WORDS = [
    "zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
    "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen",
    "nineteen", "twenty",
]
# Share of the right option's content words that, present in one field,
# amounts to restating it. Explaining why the chosen option is wrong shares
# a few words with the right one; a paraphrase of it shares most of them
# (the tests hold one of each for the pass and delete questions).
_OVERLAP_THRESHOLD = 0.6
_MIN_CONTENT_WORDS = 3


def _normalise(text: str) -> str:
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9 ]", " ", text.lower())).strip()


def _content_words(text: str) -> set[str]:
    return {w for w in _normalise(text).split() if len(w) > 3 and w not in _STOPWORDS}


def _mentions_value(text: str, value: int) -> bool:
    """The value as a standalone number or number word, except where it
    counts elements ("3 elements" states the input size, which the question
    already gave, not the answer)."""
    lowered = text.lower()
    words = [str(value)] + ([_NUMBER_WORDS[value]] if 0 <= value < len(_NUMBER_WORDS) else [])
    for word in words:
        # Not part of a formula or identifier: "n(n-1)/2" and "log2 n" name
        # the growth rate, not the count.
        for match in re.finditer(rf"(?<![\w.\-+*/^(]){re.escape(word)}(?![\w.)/*^+\-])", lowered):
            if not re.match(r"\s+elements?\b", lowered[match.end():]):
                return True
    return False


def build_leak_check(correct_label: str | None, correct_value: int | None) -> Callable[[str], bool] | None:
    """A predicate that is True for text revealing the right answer, or None
    when there is nothing to check against."""
    label = _normalise(correct_label or "")
    label_words = _content_words(correct_label or "")
    if not label and correct_value is None:
        return None

    def leaks(text: str | None) -> bool:
        if not text:
            return False
        normalised = _normalise(text)
        if label and len(label.split()) >= 2 and label in normalised:
            return True
        if len(label_words) >= _MIN_CONTENT_WORDS:
            present = label_words & _content_words(text)
            if len(present) / len(label_words) >= _OVERLAP_THRESHOLD:
                return True
        return correct_value is not None and _mentions_value(text, correct_value)

    return leaks
