import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { useState, useCallback } from "react";
import { useFocusEffect } from "expo-router";
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
      const res = await api.get("/reports/today");
      setReport(res.data);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadReport();
    }, []),
  );

  const productsSold = report?.productsSold || {};
  const sortedProducts = Object.entries(productsSold).sort(
    ([, a]: any, [, b]: any) => Number(b) - Number(a),
  );

  const totalItemsSold = sortedProducts.reduce(
    (sum: number, [, qty]: any) => sum + Number(qty),
    0,
  );

  return (
    <ScrollView style={styles.screen} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.brand}>Reports</Text>
        <Text style={styles.subtitle}>Detailed daily sales summary</Text>
      </View>

      <TouchableOpacity onPress={loadReport} style={styles.refreshButton}>
        <Ionicons name="refresh-outline" size={18} color={COLORS.white} />
        <Text style={styles.refreshText}>
          {loading ? "Loading..." : "Refresh Report"}
        </Text>
      </TouchableOpacity>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>Total Sales Today</Text>
        <Text style={styles.summaryValue}>
          ₱{formatMoney(report?.totalSales || 0)}
        </Text>
      </View>

      <View style={styles.grid}>
        <ReportCard
          icon="receipt-outline"
          label="Orders"
          value={report?.totalOrders || 0}
        />
        <ReportCard
          icon="cube-outline"
          label="Items Sold"
          value={totalItemsSold}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Product Ranking</Text>

        {sortedProducts.length > 0 ? (
          sortedProducts.map(([name, qty]: any, index) => (
            <View key={name} style={styles.rankingRow}>
              <View style={styles.rankBadge}>
                <Text style={styles.rankText}>{index + 1}</Text>
              </View>

              <Text style={styles.productName}>{name}</Text>
              <Text style={styles.productQty}>{qty} sold</Text>
            </View>
          ))
        ) : (
          <Text style={styles.empty}>No product sales yet today.</Text>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Quick Insights</Text>

        <View style={styles.insightRow}>
          <Text style={styles.insightLabel}>Best Seller</Text>
          <Text style={styles.insightValue}>
            {sortedProducts[0]?.[0] || "No sales yet"}
          </Text>
        </View>

        <View style={styles.insightRow}>
          <Text style={styles.insightLabel}>Total Items Sold</Text>
          <Text style={styles.insightValue}>{totalItemsSold}</Text>
        </View>

        <View style={styles.insightRow}>
          <Text style={styles.insightLabel}>Average Order Value</Text>
          <Text style={styles.insightValue}>
            ₱
            {formatMoney(
              report?.totalOrders
                ? (report?.totalSales || 0) / report.totalOrders
                : 0,
            )}
          </Text>
        </View>
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

function formatMoney(value: number) {
  return Number(value || 0).toLocaleString("en-PH", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
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
  summaryCard: {
    backgroundColor: COLORS.dark,
    padding: 22,
    borderRadius: 24,
    marginBottom: 12,
  },
  summaryLabel: {
    color: "#D7C2A7",
    fontWeight: "800",
  },
  summaryValue: {
    marginTop: 8,
    color: COLORS.white,
    fontWeight: "900",
    fontSize: 34,
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
  rankingRow: {
    backgroundColor: "#FFFDF8",
    padding: 14,
    borderRadius: 16,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  rankBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.gold,
    alignItems: "center",
    justifyContent: "center",
  },
  rankText: {
    color: COLORS.white,
    fontWeight: "900",
  },
  productName: {
    flex: 1,
    fontWeight: "900",
    color: COLORS.dark,
  },
  productQty: {
    fontWeight: "900",
    color: COLORS.gold,
  },
  insightRow: {
    backgroundColor: "#FFFDF8",
    padding: 14,
    borderRadius: 16,
    marginBottom: 8,
  },
  insightLabel: {
    color: COLORS.lightBrown,
    fontWeight: "800",
  },
  insightValue: {
    marginTop: 4,
    color: COLORS.dark,
    fontWeight: "900",
    fontSize: 16,
  },
  empty: {
    color: COLORS.lightBrown,
    fontWeight: "800",
  },
});
