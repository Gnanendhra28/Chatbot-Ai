from app.generation.prompt_builder import PromptBuilder, DEFAULT_SYSTEM_INSTRUCTION


def test_prompt_builder_system_instruction():
    builder = PromptBuilder()
    messages = builder.build_chat_messages("How many leaves?", [])

    assert len(messages) == 2
    assert messages[0]["role"] == "system"
    assert DEFAULT_SYSTEM_INSTRUCTION in messages[0]["content"]
    assert "NO CONTEXT AVAILABLE" in messages[0]["content"]
    assert messages[1]["role"] == "user"
    assert "QUESTION:\nHow many leaves?" in messages[1]["content"]


def test_prompt_builder_context_formatting():
    chunks = [
        {"filename": "leave_policy.pdf", "page_number": 2, "section": "Casual Leave", "text": "Employees are granted 12 casual leaves annually."},
        {"filename": "leave_policy.pdf", "page_number": 3, "section": "Sick Leave", "text": "Sick leave requires medical certificate if > 3 days."}
    ]

    builder = PromptBuilder()
    formatted = builder.format_context(chunks)

    assert '<context_chunk id="1" source="leave_policy.pdf" page="2">' in formatted
    assert "[1] leave_policy.pdf — Page 2" in formatted
    assert "Employees are granted 12 casual leaves annually." in formatted
    assert '<context_chunk id="2" source="leave_policy.pdf" page="3">' in formatted
