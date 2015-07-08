# Root of project
BASE_DIR="$HOME/synteny2/"

LENGTH_DIR="${BASE_DIR}/lengths/"
PY_DIR="${BASE_DIR}/pystuff/"
PC_TO_TRI="${BASE_DIR}/main"

# These are the thresholds used by the reduction program
LEVELS="0 100000 200000 400000 800000 1600000 3200000 6400000 12800000 25600000"
HEADER="x1,y1,x2,y2,type"

INPUT_FILE_PATH=$1
if [[ -z "$INPUT_FILE_PATH" ]] ; then
    echo "Specify an input file"
    exit 1
fi

FILENAME=$(basename $INPUT_FILE_PATH)
IDS="${FILENAME%%\.*}"
X_ID=${IDS%_*}
Y_ID=${IDS#*_}
echo X-axis organism is $X_ID
echo Y-axis organism is $Y_ID

X_LENGTH_PATH="${LENGTH_DIR}/${X_ID}.json"
Y_LENGTH_PATH="${LENGTH_DIR}/${Y_ID}.json"

if ! [[ -f "${INPUT_FILE_PATH}" ]] ; then
    echo "Couldn't find ${INPUT_FILE_PATH}"
    exit 1
fi

if ! [[ -f "${X_LENGTH_PATH}" ]] ; then
    echo "Couldn't find ${X_LENGTH_PATH}"
    exit 1
fi

if ! [[ -f "${Y_LENGTH_PATH}" ]] ; then
    echo "Couldn't find ${Y_LENGTH_PATH}"
    exit 1
fi



echo -n "Generating points and constraints from ks file... "
python3 ${PY_DIR}/ks2pc.py < "$INPUT_FILE_PATH" "$X_LENGTH_PATH" "$Y_LENGTH_PATH"
T1=${SECONDS}
echo "done. (${SECONDS} seconds, ${SECONDS} total)"



echo -n "Generating conforming triangulations... "
for pcFile in *.pc ; do
    $PC_TO_TRI < "$pcFile" > "${pcFile%.pc}.tri"
done
T2=$SECONDS
echo "done. ($((T2 - T1)) seconds, ${SECONDS} total)"



echo "Reducing triangulations at levels:"
echo "$LEVELS"
echo -n "... "
for triFile in *.tri ; do
    python3 ${PY_DIR}/simplifyTriangulation.py < "$triFile" --name "$triFile" $LEVELS
done
T3=$SECONDS
echo "done. ($((T3 - T2)) seconds, ${SECONDS} total)"



echo -n "Combining Files, cleaning up... "
for level in $LEVELS ; do
    COMBINED="${level}.csv.combined"
    echo $HEADER > $COMBINED
    for file in *.${level}.csv ; do 
        tail -n+2 $file >> $COMBINED
    done
done

mkdir -p pc tri csv
mv *.pc pc
mv *.tri tri
mv *.csv csv

mv *.csv.combined web

T4=$SECONDS
echo "done. ($((T4 - T3)) seconds, ${SECONDS} total)"

