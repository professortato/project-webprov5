// ปุ่มลับสำหรับพนักงาน: "กดค้าง" ที่โลโก้ 咲 ประมาณ 1.2 วินาที เพื่อย้อนกลับไปหน้าเลือกผู้ใช้ (/)
// ซ่อนจากลูกค้าทั่วไป (ไม่มีปุ่มให้เห็น ต้องกดค้างเท่านั้น)
(function () {
  var mark = document.querySelector(".brand-mark");
  if (!mark) return;
  var timer = null, HOLD = 1200;
  mark.style.cursor = "default";
  mark.style.webkitUserSelect = "none";
  mark.style.userSelect = "none";
  function start() { cancel(); timer = setTimeout(function () { window.location.href = "/"; }, HOLD); }
  function cancel() { if (timer) { clearTimeout(timer); timer = null; } }
  mark.addEventListener("touchstart", start, { passive: true });
  mark.addEventListener("touchend", cancel);
  mark.addEventListener("touchmove", cancel, { passive: true });
  mark.addEventListener("touchcancel", cancel);
  mark.addEventListener("mousedown", start);
  mark.addEventListener("mouseup", cancel);
  mark.addEventListener("mouseleave", cancel);
  // กัน context menu ตอนกดค้างบนมือถือ
  mark.addEventListener("contextmenu", function (e) { e.preventDefault(); });
})();
