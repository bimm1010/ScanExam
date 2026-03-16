import { GoogleGenAI } from '@google/genai';

// Initialize the API using the new official SDK
const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

let ai: GoogleGenAI | null = null;

if (apiKey) {
  ai = new GoogleGenAI({ apiKey: apiKey });
}

export const analyzeTestPaper = async (
  imageBase64: string, 
  mimeType: string,
  roster: { id: string | number, name: string }[]
) => {
  if (!ai) {
    throw new Error("Chưa cấu hình VITE_GEMINI_API_KEY. Vui lòng thêm vào file .env!");
  }

  // Convert base64 string to the part object required by the new SDK
  // The SDK expects a direct base64 string without the data URI prefix
  const cleanBase64 = imageBase64.replace(/^data:image\/(png|jpeg|webp|heic|heif);base64,/, "");

  const prompt = `
    Bạn là một trợ lý AI vô cùng thông minh giúp chấm điểm bài thi của học sinh.
    Hãy nhìn vào bức ảnh bài thi được đính kèm.
    Nhiệm vụ của bạn là tìm ra Mã Học Sinh (SBD/Mã HS/ID) HOẶC Tên học sinh, và Số Điểm (Điểm/Score/Tổng điểm) từ bức ảnh.
    
    Dưới đây là danh sách học sinh chuẩn trong lớp (để đối chiếu):
    ${JSON.stringify(roster)}
    
    Yêu cầu thực hiện:
    1. Đọc tên hoặc mã học sinh trên bài thi, sau đó khớp với danh sách học sinh truyền vào bên trên để lấy chính xác trường "id" của học sinh đó.
    2. Đọc số điểm cuối cùng được giáo viên chấm trên bài thi.
    3. Trả về đúng 1 JSON hợp lệ có cấu trúc chính xác (không kèm markdown) như sau:
    {
      "studentId": "ID của học sinh tìm được trong danh sách (chuỗi hoặc số). Trả về null nếu hình ảnh không nhận diện được ai.",
      "score": "Điểm số tìm được (ví dụ: 8.5, 9, 10). Nếu không tìm thấy điểm số, trả null.",
      "level": "T hoặc H. Quy luật: Điểm >= 9.0 là T, ngược lại nhỏ hơn 9.0 là H."
    }
  `;

  try {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
            {
                role: 'user',
                parts: [
                    {
                        inlineData: {
                            data: cleanBase64,
                            mimeType: mimeType
                        }
                    },
                    {
                        text: prompt
                    }
                ]
            }
        ],
        config: {
            responseMimeType: "application/json",
            temperature: 0.1, // Low temperature for factual extraction
        }
    });

    if (!response.text) {
        throw new Error("No text returned from Gemini.");
    }

    const result = JSON.parse(response.text);
    return result;
    
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Lỗi đường truyền Gemini API";
    console.error("Lỗi khi kết nối tới AI Gemini:", error);
    throw new Error(errorMessage);
  }
};
