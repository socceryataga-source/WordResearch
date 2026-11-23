/* Approximate learner-friendly ordering, NOT official Eiken classifications.
   Known elementary words are prioritized; otherwise Datamuse corpus-frequency
   indicators (when available) are used as a proxy for familiarity. */
(() => {
  'use strict';
  const elementary = `able about above across act action active activity add advice afraid after again age ago agree air all allow almost alone along already also always amazing animal another answer appear apple area arrive art ask attention aunt away baby back bad bag ball bank beautiful because become before begin believe below best better big bird black blue book both boy break bring brother build busy buy call can care careful carry case change child children choice choose city class clean clear close cold color come common company compare complete computer consider continue cook copy correct cost country course create cut daily danger dangerous dark date day decide decision decrease deep describe design different difficult dinner discover discuss do dog door down draw dream drink drive early earth easy eat education effect effort either else end enough enjoy environment especially even event every example excellent exercise expect explain eye face fact fall family famous far fast father favorite feel few field find fine finish fire first fish flower follow food foot for form free friend from fruit full fun future game garden general get girl give glad goal good great green group grow guess habit half hand happen happy hard have head health hear heart help helpfully high history hold home hope hot house how human idea important improve include increase information interest interesting into introduce island issue job join journey joy keep key kind know knowledge lake land language large last late laugh learn leave left lesson life light like line listen little live local long look lose love low lunch make man many map market matter mean meaning meet member mind minute miss mistake modern moment money month more morning mother mountain move movie music name natural nature near necessary need neighbor never new next nice night noise normal north note notice number object often old once open opinion opposite order other outside over own page pair paper parent park part past pay people person picture place plan plant play point poor popular possible practice prepare present pretty price problem produce product project protect provide public put question quick quiet radio rain read ready real really reason receive recent record red remember repeat reply report result return rich right river road room rule run safe safety same save say school science sea season see seem sell send sense sentence serious share short show side similar simple since sister skill sky sleep slow small smile social some soon sound south space speak special spend sport spring stand start state stay still stop story strong student study subject success successful such summer sun support sure take talk task teach teacher team tell test than thank thing think though thought time tired today together tomorrow too top topic total town train travel tree trip true try turn understand use useful usual value very view village visit voice wait walk want warm watch water way we weather week well west what when where white whole why wide wife win winter wish woman word work world write wrong year yellow yes young`.split(/\s+/);
  const intermediate = `achieve advantage affect approach appropriate avoid behavior benefit cause challenge characteristic circumstance communicate communication community connect connection consequence contain context contribute creative culture develop development effective encourage essential establish evidence experience expression familiar feature generate global identify identity impact individual influence involve issue maintain method necessary particular perform performance prevent process produce production progress purpose recognize relationship require resource respond response responsibility result significant solution structure suggest support technology tradition various`.split(/\s+/);
  const elementarySet=new Set(elementary), intermediateSet=new Set(intermediate);
  const frequency = item => Number.isFinite(item?.frequency) ? item.frequency : -1;
  const level = (word) => {
    const w=String(word||'').toLowerCase().trim();
    if(elementarySet.has(w))return 1;
    if(intermediateSet.has(w))return 2;
    return 3;
  };
  function order(items, isPhrase=false) {
    // No numeric or licensed Eiken grade claims: familiarity is only an estimate.
    return [...items].sort((a,b)=>{
      const la=level(a.word), lb=level(b.word);
      if(la!==lb)return la-lb;
      const fa=frequency(a),fb=frequency(b);
      if(fa!==fb)return fb-fa;
      const wa=a.word.split(' ').length,wb=b.word.split(' ').length;
      if(isPhrase&&wa!==wb)return wa-wb;
      return a.word.length-b.word.length || a.word.localeCompare(b.word);
    });
  }
  window.WordDifficulty={level,order};
})();
