import json, subprocess, io, base64, os, time
from cm import api, strip, search
from PIL import Image
SEL={'b_m1':"BepiColombo meets Mercury ESA23493072.png",
 'b_stack':"BepiColombo spacecraft stack ESA380846.jpg",'b_first':"BepiColombo’s first image from space ESA17828372.jpeg",
 'b_earth':"BepiColombo’s close-up of Earth during flyby ESA21938062.jpeg",'b_venus1':"BepiColombo images Venus during close approach ESA22262783.jpeg",
 'b_venus2':"BepiColombo skims past Venus ESA23427727.png",'b_m3':"BepiColombo hugs Mercury ESA24939504.png",'b_m4':"BepiColombo snaps a close-up of Mercury ESA501141.jpg",
 'b_m5':"Mercury during BepiColombo's fifth flyby ESA504685.png",'b_m6':"Mercury's sunlit north viewed by M-CAM 1 (with labels) ESA505327 - Mercury s sunlit north viewed by M-CAM 1 with labels.jpg",
 'a11_launch':"Apollo 11 Launch2.jpg",'a11_eagle':"Eagle In Lunar Orbit - GPN-2000-001210.jpg",'a11_boot':"Apollo 11 bootprint.jpg",'a11_earthrise':"AS11-44-6552.jpg",
 'a11_lm':"Earth over Apollo 11 Lunar Module, AS11-40-5924.jpg",'a11_recovery':"Apollo 11 CM hoisted aboard Hornet (S69-21783).jpg",
 'a13_launch':"Apollo 13 launch (S70-34852).jpg",'a13_sm':"View of damaged Apollo 13 Service Module from the Lunar-Command Modules (as13-59-8500).jpg",'a13_mailbox':"Apollo 13 LM with Mailbox.jpg",
 'a13_moon':"AS13-62-8913 (21354572303).jpg",'a13_lm':"Apollo 13 Lunar Module after separation from CSM (AS13-59-8562).jpg",'a13_splash':"Apollo 13 spacecraft splashdown in the South Pacific Ocean (s70-35644).jpg",
 'ar_launch':"Artemis II Launch (NHQ20260401 admin 0016).jpg",'ar_earthset':"Earthset (art002e009288).jpg",'ar_moon':"Approaching Lunar Flyby (art002e024232).jpg",
 'ar_eclipse':"Artemis II Total Solar Eclipse, Partial Frame (art002e009298).jpg",'ar_splash':"Artemis II Splashdown (KSC-20260410-PH-JMB01 0001).jpg",'ar_new':"A New View of the Moon.jpg",
 'v_launch':"Titan 3E with Voyager 1.jpg",'v_model':"Voyager spacecraft model.png",'v1_jup':"Jupiter from Voyager 1.jpg",'v1_grs':"Great Red Spot From Voyager 1.jpg",'v1_io':"Loki Patera Color Voyager.jpg",
 'v1_sat':"Saturn's ring system - Voyager 1.jpg",'v_pbd':"Pale Blue Dot.png",'v_record':"The Sounds of Earth Record Cover - GPN-2000-001978.jpg",
 'v2_jup':"Jupiter from Voyager 2.jpg",'v2_sat':"Saturn Taken from Voyager 2, ISS.tif",'v2_ura':"Uranus as seen by NASA's Voyager 2.tif",'v2_nep':"Neptune Full.jpg",'v2_tri':"Triton moon mosaic Voyager 2 (large).jpg",
 'bg_replica':"Beagle 2 replica.jpg",'bg_sep':"Beagle-2-separation.png",'bg_found':"PIA19107-Beagle2-Found-MRO-20140629.jpg",'bg_mars':"Global Mars in colour ESA24894473 (cropped).jpg",
}
meta={}
for key,title in SEL.items():
    fn=f'../img/{key}.jpg'
    d=api(dict(action='query',format='json',titles='File:'+title,prop='imageinfo',iiprop='url|extmetadata',iiurlwidth=800))
    p=list(d['query']['pages'].values())[0]
    if 'imageinfo' not in p: print('MISSING',key,title); continue
    ii=p['imageinfo'][0]; em=ii['extmetadata']
    meta[key]={'title':title,'lic':strip(em.get('LicenseShortName',{}).get('value')),'artist':strip(em.get('Artist',{}).get('value'))[:90],'desc':strip(em.get('ImageDescription',{}).get('value'))[:260],'page':ii.get('descriptionurl')}
    if not os.path.exists(fn):
        for a in range(4):
            raw=subprocess.run(["curl","-s","-L","-m","60","-A","MissionAtlasBuilder/1.0 (educational page)",ii['thumburl']],capture_output=True).stdout
            try: im=Image.open(io.BytesIO(raw)); im.load(); break
            except Exception as e: im=None; time.sleep(3)
        if im is None: print('FAIL',key); continue
        im=im.convert('RGB'); im.thumbnail((760,760)); im.save(fn,'JPEG',quality=72,optimize=True)
    print(key,os.path.getsize(fn),meta[key]['lic'],'|',meta[key]['artist'][:40],'|',meta[key]['desc'][:110])
json.dump(meta,open('../image-credits.json','w'),indent=1)
print('total',sum(os.path.getsize('../img/'+f) for f in os.listdir('../img')))
