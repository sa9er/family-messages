export class WebRTCService {
  private pc: RTCPeerConnection | null = null;
  private ws: WebSocket | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private onMessageCallback: ((data: any) => void) | null = null;

  async init(deviceId: string, onMessage: (data: any) => void) {
    this.onMessageCallback = onMessage;
    this.ws = new WebSocket(`ws://localhost:3000/signal?deviceId=${deviceId}`);
    this.ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      this.handleSignaling(msg);
    };

    this.pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
    this.pc.onicecandidate = (event) => {
      if (event.candidate && this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ice-candidate', to: this.peerId, data: event.candidate }));
      }
    };
  }

  private peerId: string = '';

  async call(targetDeviceId: string) {
    this.peerId = targetDeviceId;
    this.dataChannel = this.pc!.createDataChannel('chat');
    this.setupDataChannel();
    const offer = await this.pc!.createOffer();
    await this.pc!.setLocalDescription(offer);
    this.ws?.send(JSON.stringify({ type: 'offer', to: targetDeviceId, data: offer }));
  }

  private async handleSignaling(msg: any) {
    if (msg.type === 'offer') {
      this.peerId = msg.from;
      await this.pc!.setRemoteDescription(new RTCSessionDescription(msg.data));
      const answer = await this.pc!.createAnswer();
      await this.pc!.setLocalDescription(answer);
      this.ws?.send(JSON.stringify({ type: 'answer', to: msg.from, data: answer }));
    } else if (msg.type === 'answer') {
      await this.pc!.setRemoteDescription(new RTCSessionDescription(msg.data));
    } else if (msg.type === 'ice-candidate') {
      await this.pc!.addIceCandidate(new RTCIceCandidate(msg.data));
    }
  }

  private setupDataChannel() {
    if (!this.dataChannel) {
      this.pc!.ondatachannel = (event) => {
        this.dataChannel = event.channel;
        this.dataChannel.onmessage = (e) => this.onMessageCallback?.(JSON.parse(e.data));
      };
    } else {
      this.dataChannel.onmessage = (e) => this.onMessageCallback?.(JSON.parse(e.data));
    }
  }

  sendMessage(message: any) {
    if (this.dataChannel?.readyState === 'open') {
      this.dataChannel.send(JSON.stringify(message));
    } else {
      console.warn('Data channel not ready');
    }
  }
}
