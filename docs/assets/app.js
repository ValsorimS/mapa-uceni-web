/* Mapa učení — klientská logika: checklist „zvládnuto“ (bezpečné úložiště s fallbackem) */
(function(){
  "use strict";
  var store={mem:{},
    get:function(k){try{return window.localStorage.getItem(k);}catch(e){return (k in this.mem)?this.mem[k]:null;}},
    set:function(k,v){try{window.localStorage.setItem(k,v);}catch(e){this.mem[k]=v;}}};
  function doneSet(){try{return new Set(JSON.parse(store.get("mapa-done")||"[]"));}catch(e){return new Set();}}
  function save(s){store.set("mapa-done",JSON.stringify(Array.from(s)));}
  function cermatStatus(){try{return JSON.parse(store.get("mapa-cermat-status")||"{}")||{};}catch(e){return {};}}
  function saveCermatStatus(s){store.set("mapa-cermat-status",JSON.stringify(s));}
  var stateLabel={done:"Umím",practice:"Trénuju",problem:"Problém"};

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
    document.querySelectorAll(".cermat-status[data-cermat-key]").forEach(function(box){
      var ids=box.getAttribute("data-skill-ids").split(",").filter(Boolean);
      var n=ids.filter(function(i){return d.has(i);}).length;
      var bar=box.querySelector("i em");if(bar)bar.style.width=(ids.length?Math.round(n/ids.length*100):0)+"%";
      var cnt=box.querySelector(".cermat-skill-progress b");if(cnt)cnt.textContent=n;
    });
    refreshCermatDashboards(d);
  }

  function countDone(ids,d){
    return ids.filter(function(i,idx){return ids.indexOf(i)===idx&&d.has(i);}).length;
  }

  function refreshCermatDashboards(d){
    var statuses=cermatStatus();
    document.querySelectorAll("[data-dashboard-subject]").forEach(function(card){
      var counts={done:0,practice:0,problem:0};
      var firstProblem=null,firstPractice=null,firstOpen=null;
      card.querySelectorAll("[data-dashboard-group]").forEach(function(link){
        var state=statuses[link.getAttribute("data-key")]||"";
        if(state&&counts[state]!==undefined)counts[state]++;
        link.setAttribute("data-state",state);
        var label=link.querySelector("[data-state-label]");
        if(label)label.textContent=stateLabel[state]||"Nezařazeno";
        if(state==="problem"&&!firstProblem)firstProblem=link.href;
        if(state==="practice"&&!firstPractice)firstPractice=link.href;
        if(state!=="done"&&!firstOpen)firstOpen=link.href;
      });
      Object.keys(counts).forEach(function(k){
        var el=card.querySelector('[data-count="'+k+'"]');
        if(el)el.textContent=counts[k]+" "+(k==="done"?"umím":k==="practice"?"trénuju":"problém");
      });
      var ids=card.getAttribute("data-skill-ids").split(",").filter(Boolean);
      var n=countDone(ids,d);
      var cnt=card.querySelector(".dashboard-progress b");if(cnt)cnt.textContent=n;
      var bar=card.querySelector(".dashboard-progress i em");if(bar)bar.style.width=(ids.length?Math.round(n/ids.length*100):0)+"%";
      var next=card.querySelector("[data-continue]");
      if(next&&ids.length)next.href=firstProblem||firstPractice||firstOpen||next.href;
    });
  }

  document.querySelectorAll(".cermat-status[data-cermat-key]").forEach(function(box){
    var key=box.getAttribute("data-cermat-key");
    var paint=function(){
      var state=cermatStatus()[key]||"";
      box.setAttribute("data-state",state);
      box.querySelectorAll("button[data-state]").forEach(function(b){
        var on=b.getAttribute("data-state")===state;
        b.classList.toggle("on",on);
        b.setAttribute("aria-pressed",on?"true":"false");
      });
    };
    box.querySelectorAll("button[data-state]").forEach(function(b){
      b.addEventListener("click",function(){
        var all=cermatStatus(),state=b.getAttribute("data-state");
        all[key]===state?delete all[key]:all[key]=state;
        saveCermatStatus(all);paint();refresh();
      });
    });
    paint();
  });
  document.querySelectorAll("[data-print]").forEach(function(b){
    b.addEventListener("click",function(){window.print();});
  });
  refresh();
})();
