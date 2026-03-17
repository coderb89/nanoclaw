import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiFetch } from '../api-client';

interface Message {
  id: string;
  chat_jid: string;
  sender: string;
  sender_name: string;
  content: string;
  timestamp: string;
  is_from_me: number;
  is_bot_message: number;
}

export default function MessagesPage() {
  const { jid } = useParams<{ jid: string }>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  const decodedJid = decodeURIComponent(jid || '');

  const fetchMessages = async (before?: string) => {
    setLoading(true);
    const params = before
      ? `?before=${encodeURIComponent(before)}&limit=50`
      : '?limit=50';
    const data = await apiFetch<Message[]>(
      `/messages/${encodeURIComponent(decodedJid)}${params}`
    );
    if (before) {
      setMessages((prev) => [...data, ...prev]);
    } else {
      setMessages(data);
    }
    setHasMore(data.length === 50);
    setLoading(false);
  };

  useEffect(() => {
    fetchMessages();
  }, [jid]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const loadOlder = () => {
    if (messages.length > 0 && hasMore) {
      fetchMessages(messages[0].timestamp);
    }
  };

  return (
    <div>
      <div className="breadcrumb">
        <Link to="/groups">Groups</Link>
        <span className="breadcrumb-sep">/</span>
        <span className="mono">{decodedJid}</span>
      </div>

      <h2>Messages</h2>

      {hasMore && (
        <button onClick={loadOlder} disabled={loading} className="load-more">
          {loading ? 'Loading...' : 'Load earlier'}
        </button>
      )}

      <div className="message-list">
        {messages.map((msg) => {
          const isBot = Boolean(msg.is_from_me || msg.is_bot_message);
          return (
            <div
              key={`${msg.id}-${msg.chat_jid}`}
              className={`message ${isBot ? 'message-bot' : 'message-user'}`}
            >
              <div className="message-header">
                <span className="message-sender">
                  {msg.sender_name || msg.sender}
                </span>
                <span className="message-time">
                  {new Date(msg.timestamp).toLocaleString()}
                </span>
              </div>
              <div className="message-content">{msg.content}</div>
            </div>
          );
        })}
        {messages.length === 0 && !loading && (
          <div className="empty">No messages yet</div>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
