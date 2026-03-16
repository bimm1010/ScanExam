from django.test import TestCase
from django.urls import reverse
from rest_framework import status

class ProcessTestPaperAPITest(TestCase):
    def test_api_endpoint_exists(self):
        """Kiểm tra xem API endpoint có tồn tại và nhận request POST không"""
        url = reverse('process_test_paper') # Đảm bảo URL name là đúng
        response = self.client.post(url, {}, format='json')
        # Nó sẽ trả về 400 Bad Request vì thiếu data, nhưng chứng tỏ endpoint có hoạt động
        self.assertNotEqual(response.status_code, status.HTTP_404_NOT_FOUND)
