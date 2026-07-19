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
  function testLog(){try{return JSON.parse(store.get("mapa-cermat-tests")||"[]")||[];}catch(e){return [];}}
  function saveTestLog(s){store.set("mapa-cermat-tests",JSON.stringify(s.slice(-30)));}
  var stateLabel={done:"Umím",practice:"Trénuju",problem:"Problém"};
  var causeLabel={
    zadani:"zadání",pocitani:"počítání",jednotky:"jednotky/graf",postup:"postup",
    text:"text",pravopis:"pravopis",mluvnice:"mluvnice",skladba:"skladba",cas:"čas"
  };

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

  document.querySelectorAll("[data-weekly-plan]").forEach(function(root){
    var done=doneSet();
    var statuses=cermatStatus();
    var items=(window.MAPA_PLAN_ITEMS||[]);
    var groups=(window.MAPA_CERMAT_GROUPS||[]);
    var notDone=items.filter(function(item){return !done.has(item.id);});
    var priorityIds=[];
    groups.forEach(function(group){
      var state=statuses[group.key];
      if(state==="problem"||state==="practice"){
        group.skillIds.forEach(function(id){if(priorityIds.indexOf(id)===-1)priorityIds.push(id);});
      }
    });
    var priority=priorityIds.map(function(id){return items.find(function(item){return item.id===id&&!done.has(id);});}).filter(Boolean).slice(0,8);
    var fallback=notDone.slice(0,8);
    var chosen=(priority.length?priority:fallback).slice(0,8);
    var summary=root.querySelector("[data-plan-summary]");
    var out=root.querySelector("[data-plan-output]");
    if(summary)summary.innerHTML=done.size
      ? "Zvládnuto je "+done.size+" témat. Plán vybírá hlavně otevřené nebo problémové oblasti."
      : "Zatím nemáte odškrtnutá témata. Plán ukazuje první vhodné otevřené kroky.";
    if(!out)return;
    if(!chosen.length){
      out.innerHTML='<div class="noresults">Všechna témata jsou v tomto prohlížeči označená jako zvládnutá.</div>';
      return;
    }
    out.innerHTML='<div class="plan-output">'+chosen.map(function(item){
      return '<article class="plan-item"><span class="tag" style="background:'+item.color+'">'+item.subject+' · '+item.grade+'. ročník</span>'
        +'<h3><a href="../'+item.url+'">'+item.title+'</a></h3>'
        +(item.question?'<p><b>Otázka:</b> '+item.question.replace(/&/g,"&amp;").replace(/</g,"&lt;")+'</p>':"")
        +(item.home?'<p><b>Doma:</b> '+item.home.replace(/&/g,"&amp;").replace(/</g,"&lt;")+'</p>':"")
        +'<label><input type="checkbox"> Hotovo tento týden</label></article>';
    }).join("")+'</div>';
  });

  function selectedReviewTargets(root){
    var subject=root.querySelector('[name="subject"]').value;
    var links=[];
    root.querySelectorAll('[name="cause"]:checked').forEach(function(c){
      (c.getAttribute("data-targets")||"").split(",").filter(Boolean).forEach(function(t){
        if(t.indexOf(subject+":")===0&&links.indexOf(t)===-1)links.push(t);
      });
    });
    return links;
  }

  function paintReview(root){
    var exam=root.getAttribute("data-exam-id");
    var subject=root.querySelector('[name="subject"]').value;
    root.querySelectorAll('[name="cause"]').forEach(function(c){
      var visible=(c.getAttribute("data-targets")||"").split(",").some(function(t){return t.indexOf(subject+":")===0;});
      var label=c.closest?c.closest("label"):null;
      if(label)label.hidden=!visible;
      if(!visible)c.checked=false;
    });
    var targets=selectedReviewTargets(root);
    root.querySelectorAll("[data-review-group]").forEach(function(a){
      var id=a.getAttribute("data-review-group");
      var show=targets.indexOf(id)>-1;
      a.hidden=!show;
    });
    var rec=root.querySelector("[data-review-recommendations]");
    if(rec)rec.classList.toggle("empty",!targets.length);
    var all=testLog().filter(function(x){return x.exam===exam;}).slice(-8).reverse();
    var history=root.querySelector("[data-review-history]");
    if(history)history.innerHTML=all.length?all.map(function(x){
      return '<div class="history-item"><b>'+x.date+' · '+(x.subject==="matematika"?"Matematika":"Čeština")+' · '+(x.points||"–")+'/50</b>'
        +'<span>'+(x.time==="nestihl"?"nestihl/a":x.time==="tesne"?"těsně":"stihl/a")+' · '+x.causes.map(function(c){return causeLabel[c]||c;}).join(", ")+'</span>'
        +(x.note?'<p>'+x.note.replace(/&/g,"&amp;").replace(/</g,"&lt;")+'</p>':"")
        +'<button type="button" data-delete-test="'+x.id+'">Smazat</button></div>';
    }).join(""):'<p class="muted">Zatím žádný uložený rozbor.</p>';
    var trend=root.querySelector("[data-review-trend]");
    var sub=testLog().filter(function(x){return x.exam===exam&&x.subject===subject&&x.points!=="";});
    if(trend&&sub.length){
      var last=Number(sub[sub.length-1].points),prev=sub.length>1?Number(sub[sub.length-2].points):null;
      trend.textContent=prev===null?"Posledně "+last+"/50":"Trend "+(last-prev>=0?"+":"")+(last-prev)+" bodů";
    }else if(trend){trend.textContent="";}
  }

  document.querySelectorAll("[data-test-review]").forEach(function(root){
    var form=root.querySelector(".review-form");
    var date=form.querySelector('[name="date"]');
    if(date&&!date.value)date.value=(new Date()).toISOString().slice(0,10);
    root.addEventListener("change",function(){paintReview(root);});
    root.addEventListener("click",function(e){
      var del=e.target&&e.target.getAttribute("data-delete-test");
      if(!del)return;
      saveTestLog(testLog().filter(function(x){return x.id!==del;}));
      paintReview(root);
    });
    form.addEventListener("submit",function(e){
      e.preventDefault();
      var causes=Array.from(form.querySelectorAll('[name="cause"]:checked')).map(function(x){return x.value;});
      var entry={
        id:String(Date.now()),exam:root.getAttribute("data-exam-id"),
        date:form.querySelector('[name="date"]').value||new Date().toISOString().slice(0,10),
        subject:form.querySelector('[name="subject"]').value,
        points:form.querySelector('[name="points"]').value,
        time:form.querySelector('[name="time"]').value,
        causes:causes,
        note:form.querySelector('[name="note"]').value.trim()
      };
      var log=testLog();log.push(entry);saveTestLog(log);
      var statuses=cermatStatus();
      selectedReviewTargets(root).forEach(function(t){
        var parts=t.split(":");
        statuses[entry.exam+":"+parts[0]+":"+parts[1]]="problem";
      });
      saveCermatStatus(statuses);
      var feedback=root.querySelector("[data-review-feedback]");
      if(feedback)feedback.textContent="Uloženo a navázané okruhy jsou označené jako Problém.";
      form.querySelector('[name="note"]').value="";
      paintReview(root);refresh();
    });
    paintReview(root);
  });
  refresh();
})();
