# AI Grading System - Project Flow

This document contains a Mermaid.js chart that illustrates the complete workflow of the AI Grading System, from user interaction to backend processing.

```mermaid
graph TD
    subgraph Frontend (React App)
        A[User/Admin Logs In] --> B{Role Check};
        B -- Admin --> C[Admin Dashboard];
        B -- User --> D[User Dashboard];

        C --> C1[Manage Users/Classes/Subjects];
        C --> C2[Upload Question Paper];
        C2 --> C3[File stored in Supabase Storage];

        D --> D1[Select Class/Subject];
        D1 --> D2[Upload Answer Sheet];
        D2 --> D3[File stored in Supabase Storage];
        D3 --> E[Triggers Supabase Edge Function];
        D --> D4[View Grading Results];
        D4 -- Real-time Update --> F3;
    end

    subgraph Backend (Supabase)
        E -- answer_sheet_id --> F[Edge Function: grade-answer-sheet];
        F --> F1[Fetch Answer Sheet, Question Paper & Grading Rules];
        F1 --> F2[Call Gemini API with Data];
        F2 --> F3[Save AI Response to Database];
        F3 --> D4;
    end

    subgraph External Service
        F2 -- Grading Prompt --> G[Google Gemini AI];
        G -- JSON Response --> F2;
    end

    style C1 fill:#f9f,stroke:#333,stroke-width:2px
    style C2 fill:#f9f,stroke:#333,stroke-width:2px
    style D1 fill:#ccf,stroke:#333,stroke-width:2px
    style D2 fill:#ccf,stroke:#333,stroke-width:2px
    style D4 fill:#ccf,stroke:#333,stroke-width:2px
```

### How to View the Chart

You can view this chart in a few ways:

1.  **VS Code Extension:** If you have a Markdown previewer extension that supports Mermaid.js (like the built-in one or "Markdown Preview Mermaid Support"), you can open this file in VS Code and see the rendered chart.
2.  **Online Editors:** Copy the content of the `mermaid` block and paste it into an online Mermaid.js editor like the [Mermaid Live Editor](https://mermaid.live).
3.  **GitHub/GitLab:** If you commit this file to a GitHub or GitLab repository, it will be rendered automatically.
