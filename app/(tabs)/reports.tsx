import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { useEffect, useState } from "react";
import { api } from "@/services/api";
import { Ionicons } from "@expo/vector-icons";

const COLORS = {
  cream: "#F7EEDC",
  card: "#FFF9EE",
  brown: "#5A3825",
  lightBrown: "#A9745B",
  gold: "#B8894A",
  dark: "#2B1A12",
  white: "#FFFFFF",
};

export default function Reports() {
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const loadReport = async () => {
    try {
      setLoading(true);
      const res = await api.get("/dashboard");
      setReport(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, []);

  return (
    <ScrollView style={styles.screen} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.brand}>Reports</Text>
        <Text style={styles.subtitle}>Today’s business summary</Text>
      </View>

      <TouchableOpacity onPress={loadReport} style={styles.refreshButton}>
        <Ionicons name="refresh-outline" size={18} color={COLORS.white} />
        <Text style={styles.refreshText}>
          {loading ? "Loading..." : "Refresh"}
        </Text>
      </TouchableOpacity>

      <View style={styles.grid}>
        <ReportCard
          icon="cash-outline"
          label="Today Sales"
          value={`₱${report?.todaySales || 0}.00`}
        />
        <ReportCard
          icon="receipt-outline"
          label="Orders Today"
          value={report?.todayOrders || 0}
        />
      </View>

      <View style={styles.grid}>
        <ReportCard
          icon="fast-food-outline"
          label="Products"
          value={report?.totalProducts || 0}
        />
        <ReportCard
          icon="people-outline"
          label="Customers"
          value={report?.totalCustomers || 0}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Best Seller</Text>
        <Text style={styles.bestSeller}>
          {report?.bestSeller || "No sales yet"}
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Product Breakdown</Text>

        {report?.productsSold && Object.keys(report.productsSold).length > 0 ? (
          Object.entries(report.productsSold).map(([name, qty]: any) => (
            <View key={name} style={styles.productRow}>
              <Text style={styles.productName}>{name}</Text>
              <Text style={styles.productQty}>{qty}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.empty}>No product sales yet today.</Text>
        )}
      </View>

      <View style={{ height: 120 }} />
    </ScrollView>
  );
}

function ReportCard({ icon, label, value }: any) {
  return (
    <View style={styles.smallCard}>
      <Ionicons name={icon} size={28} color={COLORS.gold} />
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.cream,
    padding: 18,
    paddingTop: 56,
  },
  header: {
    backgroundColor: COLORS.dark,
    padding: 22,
    borderRadius: 26,
    marginBottom: 16,
  },
  brand: {
    fontSize: 32,
    fontWeight: "900",
    color: COLORS.white,
  },
  subtitle: {
    color: "#D7C2A7",
    marginTop: 4,
    fontWeight: "700",
  },
  refreshButton: {
    backgroundColor: COLORS.brown,
    padding: 14,
    borderRadius: 18,
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginBottom: 14,
  },
  refreshText: {
    color: COLORS.white,
    fontWeight: "900",
  },
  grid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  smallCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    padding: 18,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#ECDDC3",
  },
  label: {
    marginTop: 12,
    color: "#8A7B6A",
    fontWeight: "800",
  },
  value: {
    marginTop: 8,
    fontSize: 22,
    fontWeight: "900",
    color: COLORS.dark,
  },
  card: {
    backgroundColor: COLORS.card,
    padding: 18,
    borderRadius: 22,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#ECDDC3",
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: COLORS.brown,
    marginBottom: 12,
  },
  bestSeller: {
    fontSize: 18,
    color: COLORS.dark,
    fontWeight: "900",
  },
  productRow: {
    backgroundColor: "#FFFDF8",
    padding: 14,
    borderRadius: 16,
    marginBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  productName: {
    fontWeight: "800",
    color: COLORS.dark,
    flex: 1,
  },
  productQty: {
    fontWeight: "900",
    color: COLORS.gold,
  },
  empty: {
    color: COLORS.lightBrown,
    fontWeight: "800",
  },
});
