export interface Message {
  id: string;
  type: 'text' | 'audio';
  content: string;
  senderId: string;
  createdAt: number;
  duration?: number;
}

export interface FamilyData {
  familyId: string;
  memberId: string;
  token: string;
}
