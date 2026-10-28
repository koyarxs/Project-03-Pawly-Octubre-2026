import Image from "next/image";
import { ArrowUpRight, PawPrint } from "lucide-react";
import type { WebsiteCampaign } from "@/lib/website-campaigns";
import styles from "./campaign-slide.module.css";

export function CampaignSlide({ campaign, first }: { campaign: WebsiteCampaign; first: boolean }) {
  return (
    <div className={styles.campaign} data-tone={campaign.tone}>
      <div className={styles.copy}>
        <h2>{campaign.title}<em>{campaign.accent}</em></h2>
        <p>{campaign.description}</p>
        <a className={styles.action} href="/agendar-cita">Agendar una cita <ArrowUpRight size={18} aria-hidden="true" /></a>
        <span className={styles.signature}><PawPrint size={15} aria-hidden="true" /> Clínica Veterinaria Porvenir</span>
      </div>
      <div className={styles.collage}>
        <div className={styles.photo}>
          <Image src={campaign.image} alt={campaign.alt} fill sizes="(max-width: 767px) 100vw, (max-width: 1199px) 50vw, 63vw" preload={first} loading={first ? undefined : "lazy"} style={{ objectPosition: campaign.position }} />
        </div>
        <svg className={styles.doodle} viewBox="0 0 180 250" fill="none" aria-hidden="true">
          <path d="M79 92C61 71 24 51 35 28C45 8 70 20 79 36C87 11 113 5 125 24C144 54 103 78 79 92Z" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M79 101C117 133 150 115 154 154C160 207 79 199 88 242" stroke="currentColor" strokeWidth="2" strokeDasharray="5 9" strokeLinecap="round" />
          <path d="M17 83L29 77M17 58L27 63M43 99L46 86" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
        <span className={styles.paw} aria-hidden="true"><PawPrint size={30} strokeWidth={1.5} /></span>
      </div>
    </div>
  );
}
