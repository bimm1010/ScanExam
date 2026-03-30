import json
from channels.generic.websocket import AsyncWebsocketConsumer

# Max payload ~5MB (base64 jpeg)
MAX_TEXT_LENGTH = 5 * 1024 * 1024


class ScanConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.session_id = self.scope["url_route"]["kwargs"]["session_id"]
        self.room_group_name = f"scan_{self.session_id}"

        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

    async def receive(self, text_data=None, bytes_data=None):
        if not text_data or len(text_data) > MAX_TEXT_LENGTH:
            return

        try:
            message = json.loads(text_data)
        except json.JSONDecodeError:
            return

        # Broadcast to group but exclude the sender via sender_channel_name
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "scan_message",
                "message": message,
                "sender_channel_name": self.channel_name,
            }
        )

    async def scan_message(self, event):
        # Don't echo back to the sender
        if event.get("sender_channel_name") == self.channel_name:
            return

        await self.send(text_data=json.dumps(event["message"]))
