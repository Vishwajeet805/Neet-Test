
# 📝 CBT Answer Checker

A lightweight, offline **NEET Answer Checker & Result Analysis Tool** built using **HTML, CSS, and Vanilla JavaScript**. It allows you to mark your answers exactly as you solve a paper, upload the official answer key PDF, and instantly receive a detailed performance analysis.

> **Designed for personal practice. No installation. No backend. Works completely offline.**

---

## ✨ Features

### 📋 Test Interface
- 180 NEET questions
- 4 OMR-style options (1, 2, 3, 4)
- Responsive OMR bubble layout
- One-click answer selection
- Clear all responses
- Progress tracker

### ⏱ CBT Mode
- Start Test screen
- 180-minute countdown timer
- Auto-submit when timer expires
- Manual submit option
- Confirmation before manual submission

### 📚 Subject-wise Sections
Questions are grouped exactly like NEET:

- Physics (Q1–45)
- Chemistry (Q46–90)
- Botany (Q91–135)
- Zoology (Q136–180)

---

## 📄 Answer Key Processing

Simply upload the official answer key PDF.

The application automatically extracts answers from the PDF using PDF.js.

Supports multiple common answer key formats such as:

```
1. (4)

1 - 4

1) 4

Q1 = 4

1 4
```

No manual copy-paste required.

---

## 📊 Result Analysis

After checking answers, the application displays:

- ✅ Correct Answers
- ❌ Wrong Answers
- ⚪ Skipped Questions
- 📈 Accuracy Percentage
- 🎯 Total Score
- 🏆 Obtained Marks / 720

Example:

```
Correct        : 152
Wrong          : 22
Skipped        : 6

Score          : 586 / 720

Accuracy       : 84.44%
```

---

## 📖 Subject-wise Analysis

Each subject includes:

- Correct
- Wrong
- Skipped
- Marks
- Accuracy

Example:

```
Physics

Correct : 39
Wrong   : 4
Skipped : 2

Marks   : 152 / 180

Accuracy: 86.67%
```

---

## 📑 Question-wise Report

Every question is analyzed individually.

| Question | Your Answer | Correct Answer | Status |
|-----------|-------------|----------------|--------|
| 1 | 4 | 4 | ✅ Correct |
| 2 | 2 | 3 | ❌ Wrong |
| 3 | - | 1 | ⚪ Skipped |

Filter by:

- All
- Correct
- Wrong
- Skipped

---

## ⚙️ Custom Marking Scheme

Supports editable marking scheme.

Default:

```
Correct       +4

Wrong         -1

Skipped        0
```

Can easily be changed for other examinations.

---

## 🎨 UI

- Dark Theme
- Responsive Design
- Sticky Navigation
- Modern OMR Bubble Interface
- Clean Dashboard
- Fast Performance

---

## 🛠 Technologies Used

- HTML5
- CSS3
- Vanilla JavaScript
- Mozilla PDF.js

---

## 📂 Project Structure

```
NEET-Answer-Checker/

│── index.html
│── style.css
│── script.js
│── README.md
```

---

## 🚀 Getting Started

1. Download the project.
2. Extract the folder.
3. Open **index.html** in any modern browser.
4. Click **Start Test**.
5. Mark your responses.
6. Submit your answers.
7. Upload the official answer key PDF.
8. View your detailed analysis instantly.

No installation required.

No npm.

No backend.

Runs entirely in your browser.

---

## 🎯 Purpose

This project was built for **personal NEET CBT practice** to quickly evaluate mock tests without manually checking every answer.

It focuses on speed, simplicity, and detailed performance analysis while remaining completely offline.

---

## 📌 Future Improvements

- Previous test history
- Performance trend graphs
- OCR support for scanned answer keys
- Answer key image upload
- Question palette navigation
- CSV/PDF result export improvements
- Custom subject configuration

---

## 📄 License

This project is developed for **personal educational use** and practice purposes.
````
