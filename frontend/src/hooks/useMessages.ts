import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Message } from '../types';

export const useMessages = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const { familyId, token } = useAuth();

  const fetchMessages = useCallback(async () => {
    if (!familyId || !token) return;
    const data = await api.get(`/api/messages/family/${familyId}`);
    setMessages(data.messages || []);
  }, [familyId, token]);

  const sendText = async (text: string) => {
    if (!text.trim() || !familyId) return;
    const memberId = localStorage.getItem('memberId');
    await api.post('/api/messages/text', { familyId, senderId: memberId, type: 'text', content: text });
    await fetchMessages();
  };

  const sendAudio = async (blob: Blob) => {
    const formData = new FormData();
    formData.append('media', blob, 'audio.webm');
    formData.append('familyId', familyId!);
    formData.append('senderId', localStorage.getItem('memberId')!);
    formData.append('type', 'audio');
    await api.upload('/api/messages/upload', formData);
    await fetchMessages();
  };

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, [fetchMessages]);

  return { messages, sendText, sendAudio, refresh: fetchMessages };
};
