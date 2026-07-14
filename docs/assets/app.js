/* Mapa učení — klientská logika: checklist „zvládnuto“ (bezpečné úložiště s fallbackem) */
(function(){
  "use strict";
  var store={mem:{},
    get:function(k){try{return window.localStorage.getItem(k);}catch(e){return (k in this.mem)?this.mem[k]:null;}},
    set:function(k,v){try{window.localStorage.setItem(k,v);}catch(e){this.mem[k]=v;}}};
  function doneSet(){try{return new Set(JSON.parse(store.get("mapa-done")||"[]"));}catch(e){return new Set();}}
  function save(s){store.set("mapa-done",JSON.stringify(Array.from(s)));}

  /* Tlačítko na detailu tématu */
  var btn=document.querySelector(".donebtn[data-skill-id]");
  if(btn){
    var paint=function(){
      var on=doneSet().has(btn.getAttribute("data-skill-id"));
      btn.classList.toggle("on",on);
      btn.setAttribute("aria-pressed",on?"true":"false");
      btn.textContent=on?"✓ Zvládnuto":"Označit jako zvládnuté";
    };
    paint();
    btn.addEventListener("click",function(){
      var d=doneSet(),id=btn.getAttribute("data-skill-id");
      d.has(id)?d.delete(id):d.add(id);
      save(d);paint();refresh();
    });
  }

  /* Odznaky na kartách + ukazatel pokroku na stránce ročníku */
  function refresh(){
    var d=doneSet();
    document.querySelectorAll(".card[data-skill-id]").forEach(function(c){
      var m=c.querySelector(".meta");if(!m)return;
      var b=m.querySelector(".done-badge");
      if(d.has(c.getAttribute("data-skill-id"))){
        if(!b)m.insertAdjacentHTML("beforeend",' · <span class="done-badge">✓ zvládnuto</span>');
      }else if(b){b.previousSibling&&b.previousSibling.remove&&b.previousSibling.remove();b.remove();}
    });
    var pr=document.querySelector(".progress[data-ids]");
    if(pr){
      var ids=pr.getAttribute("data-ids").split(",").filter(Boolean);
      var n=ids.filter(function(i){return d.has(i);}).length;
      var bar=pr.querySelector(".bar i");if(bar)bar.style.width=(ids.length?Math.round(n/ids.length*100):0)+"%";
      var cnt=pr.querySelector(".lab b");if(cnt)cnt.textContent=n;
    }
  }
  refresh();
})();
