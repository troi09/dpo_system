/**
 * AITriageChat — Agent 1: Student Request Triage Agent (External Facing)
 *
 * Assists students in identifying the correct document type for their request
 * before form submission. Integrated into the Student New Request page.
 *
 * HITL constraint: This component only guides students. It cannot submit forms
 * or take any actions on behalf of the student.
 */
import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { sendTriageMessage } from "../services/aiService";
import "./AITriageChat.css";

const INITIAL_MESSAGE = {
  role: "agent",
  content:
    "Hello! I'm the RTU DPO Student Assistance Agent. I can help you determine which " +
    "document you need to request.\n\nPlease briefly describe your activity or purpose " +
    "(e.g., 'I need an NDA for my thesis research' or 'Our organization is holding an event'). " +
    "I will guide you to the correct form.",
};

export default function AITriageChat() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([INITIAL_MESSAGE]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [recommendation, setRecommendation] = useState(null);
  const [conversationHistory, setConversationHistory] = useState([]);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const data = await sendTriageMessage(text, conversationHistory);
      const reply = data.reply;

      setConversationHistory(data.conversationHistory || []);
      setMessages((prev) => [
        ...prev,
        { role: "agent", content: reply.message },
      ]);

      if (reply.recommendedType && reply.recommendedType !== "unclear") {
        setRecommendation(reply);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "agent",
          content:
            "I'm sorry, I encountered an error. Please try again or proceed directly to " +
            "the request forms.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleNavigateToForm = () => {
    if (recommendation?.formPath) {
      navigate(recommendation.formPath);
    }
  };

  return (
    <div className="ai-triage-chat">
      <div className="ai-triage-chat__header">
        <span className="ai-triage-chat__badge">AI</span>
        <span className="ai-triage-chat__title">DPO Student Assistance Agent</span>
      </div>

      <div className="ai-triage-chat__messages">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`ai-triage-chat__bubble ai-triage-chat__bubble--${msg.role}`}
          >
            <span className="ai-triage-chat__bubble-label">
              {msg.role === "agent" ? "Agent" : "You"}
            </span>
            <p className="ai-triage-chat__bubble-text">{msg.content}</p>
          </div>
        ))}
        {loading && (
          <div className="ai-triage-chat__bubble ai-triage-chat__bubble--agent">
            <span className="ai-triage-chat__bubble-label">Agent</span>
            <p className="ai-triage-chat__bubble-text ai-triage-chat__typing">
              Thinking…
            </p>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {recommendation && (
        <div className="ai-triage-chat__recommendation">
          <div className="ai-triage-chat__rec-title">
            Recommended Form: <strong>{recommendation.recommendedTitle}</strong>
          </div>
          {recommendation.contextComplete ? (
            <button
              className="ai-triage-chat__rec-btn"
              onClick={handleNavigateToForm}
            >
              Proceed to {recommendation.recommendedTitle} →
            </button>
          ) : (
            <p className="ai-triage-chat__rec-note">
              Please provide the missing context above before proceeding.
            </p>
          )}
          <p className="ai-triage-chat__disclaimer">
            {recommendation.disclaimer}
          </p>
        </div>
      )}

      <div className="ai-triage-chat__input-row">
        <textarea
          className="ai-triage-chat__input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Describe your activity or purpose…"
          rows={2}
          disabled={loading}
        />
        <button
          className="ai-triage-chat__send"
          onClick={handleSend}
          disabled={loading || !input.trim()}
        >
          Send
        </button>
      </div>
    </div>
  );
}
