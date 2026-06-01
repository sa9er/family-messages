export class WebRTCService {
  private pc: RTCPeerConnection | null = null;
  private ws: WebSocket | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private onMessageCallback: ((data: any) => void) | null = null;
  private onStatusCallback: ((msg: string) => void) | null = null;
  private targetId: string = '';
  private deviceId: string = '';

  async init(deviceId: string, onMessage: (data: any) => void, onStatus: (msg: string) => void) {
    this.deviceId = deviceId;
    this.onMessageCallback = onMessage;
    this.onStatusCallback = onStatus;
    this.onStatusCallback('Initializing signaling...');
    
    this.ws = new WebSocket(`ws://localhost:3000/signal?deviceId=${deviceId}`);
    this.ws.onopen = () => this.onStatusCallback?.('✅ Signaling connected');
    this.ws.onerror = () => this.onStatusCallback?.('❌ Signaling error');
    this.ws.onclose = () => this.onStatusCallback?.('⚠️ Signaling disconnected');
    this.ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      this.handleSignaling(msg);
    };
    
    this.pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
    this.pc.onicecandidate = (event) => {
      if (event.candidate && this.ws?.readyState === WebSocket.OPEN && this.targetId) {
        this.ws.send(JSON.stringify({ type: 'ice-candidate', from: this.deviceId, to: this.targetId, data: event.candidate }));
      }
    };
    this.pc.ondatachannel = (event) => {
      this.onStatusCallback?.('Incoming data channel');
      this.dataChannel = event.channel;
      this.setupDataChannel();
    };
  }

  private async handleSignaling(msg: any) {
    if (msg.type === 'offer') {
      this.targetId = msg.from;
      this.onStatusCallback?.(`Received offer from ${msg.from.substring(0,8)}...`);
      await this.pc!.setRemoteDescription(new RTCSessionDescription(msg.data));
      const answer = await this.pc!.createAnswer();
      await this.pc!.setLocalDescription(answer);
      this.ws?.send(JSON.stringify({ type: 'answer', from: this.deviceId, to: msg.from, data: answer }));
      this.onStatusCallback?.('Sent answer, waiting for connection...');
    } else if (msg.type === 'answer') {
      this.onStatusCallback?.('Received answer, establishing...');
      await this.pc!.setRemoteDescription(new RTCSessionDescription(msg.data));
      this.onStatusCallback?.('Remote description set, connection should be established');
    } else if (msg.type === 'ice-candidate') {
      await this.pc!.addIceCandidate(new RTCIceCandidate(msg.data));
    }
  }

  async call(targetDeviceId: string) {
    this.targetId = targetDeviceId;
    this.onStatusCallback?.(`Calling ${targetDeviceId.substring(0,8)}...`);
    this.dataChannel = this.pc!.createDataChannel('chat');
    this.setupDataChannel();
    const offer = await this.pc!.createOffer();
    await this.pc!.setLocalDescription(offer);
    this.ws?.send(JSON.stringify({ type: 'offer', from: this.deviceId, to: targetDeviceId, data: offer }));
    this.onStatusCallback?.('Offer sent, waiting for answer...');
  }

  private setupDataChannel() {
    if (this.dataChannel) {
      this.dataChannel.onmessage = (e) => this.onMessageCallback?.(JSON.parse(e.data));
      this.dataChannel.onopen = () => {
        this.onStatusCallback?.('✅ Data channel open – Connected!');
      };
      this.dataChannel.onclose = () => this.onStatusCallback?.('Data channel closed');
      this.dataChannel.onerror = (err) => this.onStatusCallback?.(`Data channel error: ${err}`);
    }
  }

  sendMessage(message: any) {
    if (this.dataChannel?.readyState === 'open') {
      this.dataChannel.send(JSON.stringify(message));
      return true;
    } else {
      this.onStatusCallback?.('Cannot send: data channel not ready');
      return false;
    }
  }
}
