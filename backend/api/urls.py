from django.urls import path
from . import views

urlpatterns = [
    path('health/', views.health_check, name='health_check'),
    path('server-info/', views.server_info, name='server_info'),
    path('process-test-paper/', views.process_test_paper, name='process_test_paper'),
    path('get-sheet-results/', views.get_sheet_results, name='get_sheet_results'),
    path('delete-image/', views.delete_image, name='delete_image'),
    path('upload-roster-excel/', views.upload_roster_excel, name='upload_roster_excel'),
    path('download-updated-excel/', views.download_updated_excel, name='download_updated_excel'),
    path('preview-excel/', views.preview_excel, name='preview_excel'),
    path('analyze-excel-columns/', views.analyze_excel_columns, name='analyze_excel_columns'),
    path('reset-system/', views.reset_system, name='reset_system'),
    path('sync-roster/', views.sync_roster, name='sync_roster'),
    path('scan-upload/<str:session_id>/', views.scan_upload, name='scan_upload'),
    path('scan-poll/<str:session_id>/', views.scan_poll, name='scan_poll'),
]
