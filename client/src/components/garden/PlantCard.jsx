import plant1 from "../../assets/plants/plant-1.svg";
import plant2 from "../../assets/plants/plant-2.svg";
import plant3 from "../../assets/plants/plant-3.svg";
import plant4 from "../../assets/plants/plant-4.svg";
import plant5 from "../../assets/plants/plant-5.svg";
import plant6 from "../../assets/plants/plant-6.svg";
import plantDead from "../../assets/plants/plant-dead.svg";
import plantWilted from "../../assets/plants/plant-wilted.svg";
import styles from "./PlantCard.module.css";
import PlantTooltip from "./PlantTooltip.jsx";

const PLANT_IMGS = { 1: plant1, 2: plant2, 3: plant3, 4: plant4, 5: plant5, 6: plant6 };

export default function PlantCard({ plant }) {
  const imgSrc =
    plant.status === "dead" ? plantDead : plant.status === "wilted" ? plantWilted : (PLANT_IMGS[plant.level] ?? plant1);

  const imgAlt =
    plant.status === "dead" ? "Dead plant" : plant.status === "wilted" ? "Wilted plant" : `Level ${plant.level} plant`;

  const statusClass = styles[plant.status] ?? "";

  return (
    <div className={`${styles.card} ${statusClass}`}>
      <div className={styles.potWrap}>
        <img src={imgSrc} alt={imgAlt} className={styles.plantImg} />
        {plant.habit_emoji && <span className={styles.potEmoji}>{plant.habit_emoji}</span>}
      </div>

      <div className={styles.tooltipWrap}>
        <PlantTooltip plant={plant} />
      </div>
    </div>
  );
}
