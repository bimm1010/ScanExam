import os
import unittest
from unittest.mock import MagicMock, patch
from api.views import call_gemini_with_router

class TestApiKeyRotation(unittest.TestCase):
    @patch('api.views.api_keys', ['mock_key_1', 'mock_key_2'])
    @patch('api.views.get_gemini_client')
    @patch('api.views.client')
    def test_rotation_on_429(self, mock_client_var, mock_get_client):
        # Setup mock client behavior
        mock_client_1 = MagicMock()
        mock_client_2 = MagicMock()
        
        # First call fails with 429
        mock_client_1.models.generate_content.side_effect = Exception("429 Resource Exhausted")
        # Second call (after rotation) succeeds
        mock_client_2.models.generate_content.return_value = MagicMock(text='{"success": true}')
        
        mock_get_client.side_effect = [mock_client_2]
        
        # We need to ensure the global 'client' in api.views is updated
        # This is tricky with mocks, so let's check if call_gemini_with_router handles it
        
        # For the test, we'll simulate the internal state
        import api.views
        api.views.client = mock_client_1
        api.views.current_key_index = 0
        
        result = call_gemini_with_router("test prompt", b"some image data")
        
        # Verify it rotated
        self.assertEqual(api.views.current_key_index, 1)
        self.assertEqual(result, {"success": True})
        print("✅ Success: Key rotated from Index 0 to 1 upon 429 error.")

if __name__ == '__main__':
    unittest.main()
