// v3.49: Khai báo xe – "Điền vào bảng" cho tháng khác tháng đang xem.
// Trước đây chỉ điền ngày thuộc tháng đang xem nhưng vẫn báo "Đã điền", nên khai báo tháng sau (vd 01/11–30/11 khi đang xem tháng 10) không lưu được gì.
// Nay: tự chuyển sang tháng của "Từ ngày", điền và báo đúng số ngày; phần sang tháng sau thì báo cần điền tiếp; không điền được ngày nào thì báo lỗi.
// Chuyển tháng / đổi kho khi còn thay đổi chưa lưu thì hỏi lại thay vì xóa âm thầm.
(()=>{
  const ym62=ds=>ds.slice(0,7);
  const curYm62=()=>`${V.ym[0]}-${pad(V.ym[1])}`;
  const dirty62=()=>V.view==='fleet'&&Object.keys(V.fleetEdit||{}).length>0;
  const askLose62=()=>!dirty62()||confirm('Bảng Khai báo xe còn thay đổi chưa lưu. Bỏ các thay đổi này?');

  A.bulkApply=()=>{
    const B={from:TODAY,to:addDays(TODAY,6),dk:9,cn:4,...(V.bulk||{})};
    let from=B.from||TODAY,to=B.to||from;
    if(to<from){toastErr('"Đến ngày" phải sau "Từ ngày".');return;}
    if(to<TODAY){toastErr('Khoảng ngày đã qua, không khai báo được.');return;}
    const dk=parseInt(B.dk,10),cn=parseInt(B.cn,10);
    if(!(dk>=0&&dk<=99&&cn>=0&&cn<=99)){toastErr('Số DK và số XT phải là số nguyên 0–99.');return;}
    if(from<TODAY)from=TODAY;
    const target=ym62(from);
    let need=false;
    if(target!==curYm62()){
      if(!askLose62())return;
      V.fleetEdit={};need=goMonth(target+'-01');
    }
    let n=0,off=0,rest=0;
    for(let d=from;d<=to;d=addDays(d,1)){
      if(ym62(d)!==target){rest++;continue;}
      if(isHoliday(V.wh,d)){off++;continue;}
      V.fleetEdit[d]={...(V.fleetEdit[d]||{}),dk:String(dk),cn:String(cn)};n++;
    }
    const [y,m]=target.split('-');
    if(!n){afterNav(need);toastErr(`Không có ngày nào được điền trong tháng ${m}/${y}`+(off?` (${off} ngày nghỉ bị bỏ qua)`:'')+'.');return;}
    let msg=`Đã điền ${n} ngày tháng ${m}/${y}`+(off?`, bỏ qua ${off} ngày nghỉ`:'')+'. Bấm Lưu để áp dụng.';
    if(rest)msg+=` Còn ${rest} ngày sang tháng sau: lưu xong chuyển tháng rồi điền tiếp.`;
    afterNav(need);toast(msg);
  };

  const month0=A.month;A.month=d=>{if(!askLose62())return;month0(d);};
  // Đổi kho cũng xóa bảng tạm (bộ xử lý change ở cuối app.js): hỏi trước, chọn Không thì trả lại kho cũ.
  document.addEventListener('change',e=>{const el=e.target;if(el?.dataset?.a==='wh'&&el.value!==V.wh&&!askLose62()){el.value=V.wh;e.stopImmediatePropagation();}},true);
})();
